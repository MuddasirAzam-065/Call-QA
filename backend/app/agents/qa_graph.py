"""
The core AI workflow, built with LangGraph on top of LangChain.

Graph shape:

    validate_input
         |
         v (invalid) --------------------> END (state["error"] set)
         |
         v (valid)
    score_and_sentiment  ---- LLM calls #1 + #2, run CONCURRENTLY:
         |                    - per-criterion scores + explanations
         |                    - sentiment detection (bonus)
         |                    (these don't depend on each other, so they're
         |                     fired together with asyncio.gather instead of
         |                     waiting on each other - this is the main
         |                     speed win: 3 network round-trips instead of 4)
         v
    compute_overall_score  ---- LLM call #3 (aggregates + audits category scores)
         |
         v
    generate_feedback  ---- LLM call #4 (strengths / problems / advice / highlights)
         |
         v
        END

Each node is a small, focused responsibility - this is the "multi-step /
agent-style QA workflow" LangGraph is used for, instead of one giant prompt.
Every LLM call asks for strict JSON and is parsed + validated with Pydantic,
with one automatic retry if the model returns malformed JSON (common with
small free-tier models).
"""
from __future__ import annotations

import asyncio
import json
import re
from typing import List, Optional, TypedDict

from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END

from app.config import get_llm, model_label
from app.models import (
    CategoryResult,
    HighlightedSentence,
    OverallScore,
    SentimentResult,
)
from app.agents.prompts import (
    CRITERIA_DEFINITIONS,
    DEFAULT_CRITERIA,
    category_prompt,
    feedback_prompt,
    get_language_instruction,
    overall_prompt,
    sentiment_prompt,
)


# ---------------------------------------------------------------------------
# Local wrapper schemas for parsing each node's JSON output
# ---------------------------------------------------------------------------

class _CategoriesOutput(BaseModel):
    categories: List[CategoryResult]


class _FeedbackOutput(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    problems: List[str] = Field(default_factory=list)
    improvement_advice: List[str] = Field(default_factory=list)
    highlighted_sentences: List[HighlightedSentence] = Field(default_factory=list)


class QAState(TypedDict, total=False):
    transcript: str
    criteria: List[str]
    response_language: str
    has_speaker_labels: bool
    categories: List[dict]
    sentiment: dict
    overall_score: dict
    strengths: List[str]
    problems: List[str]
    improvement_advice: List[str]
    highlighted_sentences: List[dict]
    error: Optional[str]
    model_used: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_code_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    return text


def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc)
    return "429" in msg or "rate-limited" in msg.lower() or "rate_limit" in msg.lower()


def _extract_retry_after_seconds(exc: Exception, default: float) -> float:
    """Pulls 'retry_after_seconds': 5 out of OpenRouter's error payload if present."""
    match = re.search(r"retry_after_seconds['\"]?\s*[:=]\s*(\d+(?:\.\d+)?)", str(exc))
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return default


async def _call_llm_with_retry(chain, variables: dict, max_attempts: int = 4):
    """
    Calls the LLM, automatically retrying with backoff on transient upstream
    errors - most commonly HTTP 429 from OpenRouter's shared free-tier pool,
    which is expected to happen occasionally on busy free models and isn't
    a bug in this app. Honors the provider's suggested Retry-After delay
    when it's present in the error payload.
    """
    last_error = None
    for attempt in range(max_attempts):
        try:
            return await chain.ainvoke(variables)
        except Exception as e:  # noqa: BLE001 - broad on purpose, classified below
            last_error = e
            if not _is_rate_limit_error(e) or attempt == max_attempts - 1:
                raise
            wait_seconds = _extract_retry_after_seconds(e, default=2.0 * (2 ** attempt))
            await asyncio.sleep(wait_seconds)

    raise RuntimeError(
        f"The model is still rate-limited by the provider's free-tier shared pool "
        f"after {max_attempts} retries. Wait a minute and try again, or switch "
        f"OPENROUTER_MODEL in backend/.env to a less congested model "
        f"(e.g. openai/gpt-4o-mini, anthropic/claude-3.5-haiku, or another :free model)."
    ) from last_error


async def _ainvoke_json(prompt, parser: JsonOutputParser, variables: dict) -> dict:
    """Async: call the LLM with a prompt + JSON parser, retrying once on bad JSON."""
    llm = get_llm()
    chain = prompt | llm
    last_error = None
    for attempt in range(2):
        raw = await _call_llm_with_retry(chain, variables)
        content = raw.content if hasattr(raw, "content") else str(raw)
        cleaned = _strip_code_fences(content)
        try:
            return parser.parse(cleaned)
        except Exception as e:  # noqa: BLE001 - broad on purpose, we retry/raise
            last_error = e
            try:
                # last-ditch: grab the first {...} block
                match = re.search(r"\{.*\}", cleaned, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
            except Exception:  # noqa: BLE001
                pass
            variables = {
                **variables,
                "format_instructions": variables.get("format_instructions", "")
                + "\n\nIMPORTANT: Your previous response was not valid JSON. "
                  "Return ONLY a single valid JSON object, nothing else.",
            }
    raise RuntimeError(f"Model did not return valid JSON after retry: {last_error}")


def _criteria_block(criteria: List[str]) -> str:
    lines = []
    for i, c in enumerate(criteria, start=1):
        definition = CRITERIA_DEFINITIONS.get(c, "Evaluate this custom criterion based on its name.")
        lines.append(f"{i}. {c} - {definition}")
    return "\n".join(lines)


def _transcript_for_llm(state: "QAState") -> str:
    """
    If the transcript has no explicit speaker labels (common for raw
    speech-to-text output with no diarization), prepend a short note asking
    the model to infer who's speaking from context, rather than failing.
    """
    transcript = state["transcript"]
    if state.get("has_speaker_labels"):
        return transcript
    return (
        "[Note: this transcript has no explicit speaker labels - it is raw "
        "speech-to-text output. Infer who is the agent/representative and who "
        "is the customer/caller from context, tone, and content (e.g. whoever "
        "greets the caller and offers help is the agent) before evaluating.]\n\n"
        f"{transcript}"
    )


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def validate_input(state: QAState) -> QAState:
    transcript = state.get("transcript", "").strip()
    if len(transcript) < 20:
        return {**state, "error": "Transcript is too short to analyze."}

    word_count = len(transcript.split())
    if word_count < 8:
        return {
            **state,
            "error": "This doesn't look like enough spoken content to evaluate as a call.",
        }

    # Speaker labels (e.g. "Agent:", "Customer:") are a nice-to-have, not a
    # requirement - transcripts from speech-to-text (Whisper, live dictation)
    # often come back as one continuous block with no labels at all. When
    # labels are missing we don't block the request; instead we flag it so
    # the LLM prompts know to infer who's speaking from context.
    has_speaker_labels = bool(
        re.search(r"(agent|customer|caller|rep|representative)\s*[:\-]", transcript, re.IGNORECASE)
    )

    criteria = state.get("criteria") or DEFAULT_CRITERIA
    return {
        **state,
        "criteria": criteria,
        "has_speaker_labels": has_speaker_labels,
        "error": None,
    }


async def score_and_sentiment(state: QAState) -> QAState:
    """
    Runs category scoring and sentiment detection CONCURRENTLY - they're
    independent (both only need the transcript), so there's no reason to
    make the user wait for them sequentially. This is the main latency win:
    it turns 2 of the workflow's 4 LLM round-trips into 1 round-trip's worth
    of wall-clock time.
    """
    if state.get("error"):
        return state

    transcript_for_llm = _transcript_for_llm(state)
    language_instruction = get_language_instruction(state.get("response_language", "auto"))

    categories_parser = JsonOutputParser(pydantic_object=_CategoriesOutput)
    sentiment_parser = JsonOutputParser(pydantic_object=SentimentResult)

    categories_task = _ainvoke_json(
        category_prompt,
        categories_parser,
        {
            "criteria_block": _criteria_block(state["criteria"]),
            "transcript": transcript_for_llm,
            "language_instruction": language_instruction,
            "format_instructions": categories_parser.get_format_instructions(),
        },
    )
    sentiment_task = _ainvoke_json(
        sentiment_prompt,
        sentiment_parser,
        {
            "transcript": transcript_for_llm,
            "language_instruction": language_instruction,
            "format_instructions": sentiment_parser.get_format_instructions(),
        },
    )

    categories_result, sentiment_result = await asyncio.gather(categories_task, sentiment_task)

    validated_categories = _CategoriesOutput.model_validate(categories_result)
    validated_sentiment = SentimentResult.model_validate(sentiment_result)

    return {
        **state,
        "categories": [c.model_dump() for c in validated_categories.categories],
        "sentiment": validated_sentiment.model_dump(),
    }


async def compute_overall_score(state: QAState) -> QAState:
    if state.get("error"):
        return state
    categories_summary = "\n".join(
        f"- {c['name']}: {c['score']}/10 ({c['verdict']}) - {c['explanation']}"
        for c in state["categories"]
    )
    sentiment = state["sentiment"]
    sentiment_summary = (
        f"Overall: {sentiment['overall_sentiment']}; "
        f"Customer started {sentiment['customer_sentiment_start']}, "
        f"ended {sentiment['customer_sentiment_end']}; "
        f"Agent tone: {sentiment['agent_tone']}"
    )
    parser = JsonOutputParser(pydantic_object=OverallScore)
    result = await _ainvoke_json(
        overall_prompt,
        parser,
        {
            "categories_summary": categories_summary,
            "sentiment_summary": sentiment_summary,
            "language_instruction": get_language_instruction(state.get("response_language", "auto")),
            "format_instructions": parser.get_format_instructions(),
        },
    )
    validated = OverallScore.model_validate(result)
    return {**state, "overall_score": validated.model_dump()}


async def generate_feedback(state: QAState) -> QAState:
    if state.get("error"):
        return state
    categories_summary = "\n".join(
        f"- {c['name']}: {c['score']}/10 - {c['explanation']}" for c in state["categories"]
    )
    sentiment = state["sentiment"]
    sentiment_summary = (
        f"{sentiment['overall_sentiment']} overall; customer went from "
        f"{sentiment['customer_sentiment_start']} to {sentiment['customer_sentiment_end']}"
    )
    parser = JsonOutputParser(pydantic_object=_FeedbackOutput)
    result = await _ainvoke_json(
        feedback_prompt,
        parser,
        {
            "categories_summary": categories_summary,
            "overall_score": state["overall_score"]["score"],
            "overall_explanation": state["overall_score"]["explanation"],
            "sentiment_summary": sentiment_summary,
            "transcript": _transcript_for_llm(state),
            "language_instruction": get_language_instruction(state.get("response_language", "auto")),
            "format_instructions": parser.get_format_instructions(),
        },
    )
    validated = _FeedbackOutput.model_validate(result)
    return {
        **state,
        "strengths": validated.strengths,
        "problems": validated.problems,
        "improvement_advice": validated.improvement_advice,
        "highlighted_sentences": [h.model_dump() for h in validated.highlighted_sentences],
        "model_used": model_label(),
    }


def _route_after_validation(state: QAState) -> str:
    return "invalid" if state.get("error") else "valid"


# ---------------------------------------------------------------------------
# Build the graph once at import time
# ---------------------------------------------------------------------------

def build_qa_graph():
    graph = StateGraph(QAState)

    graph.add_node("validate_input", validate_input)
    graph.add_node("score_and_sentiment", score_and_sentiment)
    graph.add_node("compute_overall_score", compute_overall_score)
    graph.add_node("generate_feedback", generate_feedback)

    graph.set_entry_point("validate_input")
    graph.add_conditional_edges(
        "validate_input",
        _route_after_validation,
        {"invalid": END, "valid": "score_and_sentiment"},
    )
    graph.add_edge("score_and_sentiment", "compute_overall_score")
    graph.add_edge("compute_overall_score", "generate_feedback")
    graph.add_edge("generate_feedback", END)

    return graph.compile()


qa_graph = build_qa_graph()


async def run_qa_workflow(
    transcript: str,
    criteria: Optional[List[str]] = None,
    response_language: str = "auto",
) -> QAState:
    initial_state: QAState = {
        "transcript": transcript,
        "criteria": criteria or DEFAULT_CRITERIA,
        "response_language": response_language,
    }
    final_state = await qa_graph.ainvoke(initial_state)
    return final_state
