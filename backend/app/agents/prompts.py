"""
All prompt templates live here, separate from the graph wiring, so they're
easy to tune independently (this is the "create your own QA prompt /
instructions" requirement - nothing here is hard-coded output, only
instructions for the model).
"""
from langchain_core.prompts import ChatPromptTemplate

DEFAULT_CRITERIA = [
    "Greeting",
    "Professionalism",
    "Issue Understanding",
    "Communication",
    "Resolution / Closing",
]

CRITERIA_DEFINITIONS = {
    "Greeting": "Did the agent open the call appropriately (identify themselves, the company, "
                "greet the customer, and set a helpful tone)?",
    "Professionalism": "Was the agent polite, clear, patient, and professional throughout, "
                        "even under pressure or frustration from the customer?",
    "Issue Understanding": "Did the agent correctly identify and understand the customer's "
                            "need, question, or problem before acting on it?",
    "Communication": "Was the agent's communication helpful, easy to follow, well-paced, "
                      "and free of jargon or confusing explanations?",
    "Resolution / Closing": "Was an appropriate next step, fix, or resolution provided, and "
                             "was the call closed properly (confirmed the issue was resolved, "
                             "thanked the customer, clear next steps)?",
}


def get_language_instruction(response_language: str) -> str:
    """
    Builds the instruction line telling the model what language to write its
    explanations, feedback, and verdicts in. Field names/keys stay in English
    (they're part of the JSON schema); only the human-readable text changes.
    Urdu is fully supported - the model writes natively in Urdu script.
    """
    lang = (response_language or "auto").strip().lower()
    if lang in ("urdu", "ur"):
        return (
            "IMPORTANT: Write all explanations, verdicts, strengths, problems, and advice "
            "in Urdu (اردو), using Urdu script. Keep JSON field/key names in English exactly "
            "as specified in the schema - only the VALUES (the actual text) should be Urdu."
        )
    if lang in ("english", "en"):
        return "Write all explanations, verdicts, strengths, problems, and advice in English."
    # auto
    return (
        "Write all explanations, verdicts, strengths, problems, and advice in the SAME "
        "language the transcript is written in (for example, respond in Urdu if the "
        "transcript is in Urdu). Keep JSON field/key names in English exactly as specified "
        "in the schema - only the VALUES (the actual text) should match the transcript's language."
    )


# ---------------------------------------------------------------------------
# 1. Category scoring
# ---------------------------------------------------------------------------
CATEGORY_SYSTEM_PROMPT = """You are a senior Call Quality Assurance analyst for a customer \
support center. You review call transcripts objectively and rigorously, the way a strict but \
fair QA lead would. You never invent facts that are not in the transcript. You always explain \
the reasoning behind every score using specific evidence quoted or paraphrased from the transcript.

Score each QA criterion from 0-10 (0 = completely failed, 10 = excellent, textbook execution).
Be specific in your explanations - reference what the agent actually said or did.
"""

CATEGORY_HUMAN_PROMPT = """Evaluate the following customer-service call transcript against \
these QA criteria:

{criteria_block}

TRANSCRIPT:
---
{transcript}
---

{language_instruction}

{format_instructions}

Return ONLY the JSON object, no extra commentary.
"""

category_prompt = ChatPromptTemplate.from_messages(
    [("system", CATEGORY_SYSTEM_PROMPT), ("human", CATEGORY_HUMAN_PROMPT)]
)

# ---------------------------------------------------------------------------
# 2. Sentiment detection (bonus feature)
# ---------------------------------------------------------------------------
SENTIMENT_SYSTEM_PROMPT = """You are an expert in conversational sentiment analysis for \
customer support calls. You track how the customer's emotional state evolves across the call \
and assess the agent's tone."""

SENTIMENT_HUMAN_PROMPT = """Analyze the sentiment of this call transcript.

TRANSCRIPT:
---
{transcript}
---

{language_instruction}

{format_instructions}

Return ONLY the JSON object, no extra commentary.
"""

sentiment_prompt = ChatPromptTemplate.from_messages(
    [("system", SENTIMENT_SYSTEM_PROMPT), ("human", SENTIMENT_HUMAN_PROMPT)]
)

# ---------------------------------------------------------------------------
# 3. Overall score (validation/aggregation step)
# ---------------------------------------------------------------------------
OVERALL_SYSTEM_PROMPT = """You are a QA scoring auditor. You are given per-category scores \
(0-10 each) that another analyst already produced for a call transcript, along with the sentiment \
read on the call. Your job is to produce ONE overall score out of 100 that reflects the whole call, \
and a short (2-4 sentence) explanation that a team lead could read in five seconds to understand \
call quality. Weigh Issue Understanding and Resolution/Closing slightly higher than the others, \
since those most affect the customer outcome. Do not just mechanically average - use judgement, \
but stay consistent with the category scores you were given (do not contradict them)."""

OVERALL_HUMAN_PROMPT = """Category scores (out of 10 each):
{categories_summary}

Sentiment read on the call:
{sentiment_summary}

{language_instruction}

{format_instructions}

Return ONLY the JSON object, no extra commentary.
"""

overall_prompt = ChatPromptTemplate.from_messages(
    [("system", OVERALL_SYSTEM_PROMPT), ("human", OVERALL_HUMAN_PROMPT)]
)

# ---------------------------------------------------------------------------
# 4. Feedback generation: strengths / problems / improvement advice /
#    highlighted sentences (bonus feature)
# ---------------------------------------------------------------------------
FEEDBACK_SYSTEM_PROMPT = """You are a supportive but honest call-coaching expert. You write \
feedback that a real customer-service agent would find useful and fair - specific, actionable, \
and evidence-based. Never be vague ("be more professional") - always say what to do differently \
and, where useful, how. You also select the 3-6 most important individual sentences from the \
transcript (from either speaker) that most influenced the QA outcome - the best and worst moments \
of the call - so a reviewer can jump straight to them."""

FEEDBACK_HUMAN_PROMPT = """Here is the full QA analysis so far for this call:

CATEGORY SCORES:
{categories_summary}

OVERALL SCORE: {overall_score}/100 - {overall_explanation}

SENTIMENT: {sentiment_summary}

TRANSCRIPT:
---
{transcript}
---

Based on all of the above, produce:
1. strengths - what the agent did well (specific, evidence-based)
2. problems - important mistakes, risks, or weak areas found in the call
3. improvement_advice - practical, actionable suggestions for improving agent performance
4. highlighted_sentences - the 3-6 most important individual sentences from the transcript \
(quote them close to verbatim), who said them, why they matter, and whether they were a positive, \
negative, or neutral moment in the call

{language_instruction}

{format_instructions}

Return ONLY the JSON object, no extra commentary.
"""

feedback_prompt = ChatPromptTemplate.from_messages(
    [("system", FEEDBACK_SYSTEM_PROMPT), ("human", FEEDBACK_HUMAN_PROMPT)]
)
