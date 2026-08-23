"""
Pydantic models used for:
  1. Validating incoming API requests
  2. Constraining/validating structured LLM output (LangChain structured parsing)
  3. Shaping the JSON the frontend renders
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    transcript: str = Field(..., description="Raw customer-service call transcript")
    criteria: Optional[List[str]] = Field(
        default=None,
        description=(
            "Optional configurable QA criteria overriding the default five "
            "(Greeting, Professionalism, Issue Understanding, Communication, "
            "Resolution/Closing). Bonus feature: configurable QA criteria."
        ),
    )
    save_to_history: bool = Field(default=True)
    call_title: Optional[str] = Field(default=None, description="Optional label for history list")
    response_language: str = Field(
        default="auto",
        description=(
            "Language for the AI's explanations/feedback: 'auto' (matches the "
            "transcript's language), 'english', or 'urdu'."
        ),
    )

    @field_validator("transcript")
    @classmethod
    def transcript_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Transcript must not be empty.")
        if len(v.strip()) < 20:
            raise ValueError("Transcript is too short to analyze meaningfully (min ~20 characters).")
        if len(v) > 20000:
            raise ValueError("Transcript is too long (max 20,000 characters).")
        return v


# ---------------------------------------------------------------------------
# Structured LLM output models (also serve as the API response shape)
# ---------------------------------------------------------------------------

class CategoryResult(BaseModel):
    name: str = Field(..., description="Name of the QA category")
    score: int = Field(..., ge=0, le=10, description="Score for this category out of 10")
    verdict: str = Field(..., description="Short pass/fail/partial style verdict")
    explanation: str = Field(..., description="Reasoning behind the score")


class OverallScore(BaseModel):
    score: int = Field(..., ge=0, le=100)
    explanation: str


class SentimentResult(BaseModel):
    overall_sentiment: str = Field(..., description="positive | neutral | negative | mixed")
    customer_sentiment_start: str
    customer_sentiment_end: str
    agent_tone: str
    explanation: str


class HighlightedSentence(BaseModel):
    speaker: str = Field(..., description="Who said it, e.g. Agent or Customer")
    sentence: str
    reason: str
    importance: str = Field(..., description="positive | negative | neutral")


class QAReport(BaseModel):
    model_config = {"protected_namespaces": ()}

    id: Optional[str] = None
    created_at: Optional[str] = None
    call_title: Optional[str] = None

    overall_score: OverallScore
    categories: List[CategoryResult]
    sentiment: SentimentResult
    strengths: List[str]
    problems: List[str]
    improvement_advice: List[str]
    highlighted_sentences: List[HighlightedSentence] = Field(default_factory=list)

    transcript_preview: Optional[str] = None
    model_used: Optional[str] = None
    response_language: Optional[str] = None


class AnalyzeResponse(BaseModel):
    success: bool
    report: Optional[QAReport] = None
    error: Optional[str] = None


class HistoryListResponse(BaseModel):
    items: List[QAReport]


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
