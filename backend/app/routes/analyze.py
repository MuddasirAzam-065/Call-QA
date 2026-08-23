from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app.agents.qa_graph import run_qa_workflow
from app.models import AnalyzeRequest, AnalyzeResponse, QAReport
from app.history_store import save_report

router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_call(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Runs the transcript through the LangGraph QA workflow and returns a
    structured QA report. Handles both invalid input (400) and
    model/API failures (502) gracefully, as required by the spec.
    """
    try:
        state = await run_qa_workflow(payload.transcript, payload.criteria, payload.response_language)
    except RuntimeError as e:
        # Missing API key, network error to the provider, etc.
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}") from e
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {e}") from e

    if state.get("error"):
        raise HTTPException(status_code=400, detail=state["error"])

    try:
        report = QAReport(
            call_title=payload.call_title,
            overall_score=state["overall_score"],
            categories=state["categories"],
            sentiment=state["sentiment"],
            strengths=state["strengths"],
            problems=state["problems"],
            improvement_advice=state["improvement_advice"],
            highlighted_sentences=state.get("highlighted_sentences", []),
            transcript_preview=payload.transcript[:280],
            model_used=state.get("model_used"),
            response_language=payload.response_language,
        )
    except ValidationError as e:
        raise HTTPException(status_code=502, detail=f"Model returned malformed data: {e}") from e

    report_dict = report.model_dump()
    if payload.save_to_history:
        report_dict = save_report(report_dict)

    return AnalyzeResponse(success=True, report=QAReport.model_validate(report_dict))
