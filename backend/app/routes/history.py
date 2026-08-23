from fastapi import APIRouter, HTTPException

from app.models import HistoryListResponse, QAReport
from app.history_store import delete_report, get_report, list_reports

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
def get_history() -> HistoryListResponse:
    return HistoryListResponse(items=[QAReport.model_validate(r) for r in list_reports()])


@router.get("/{report_id}", response_model=QAReport)
def get_history_item(report_id: str) -> QAReport:
    report = get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return QAReport.model_validate(report)


@router.delete("/{report_id}")
def delete_history_item(report_id: str) -> dict:
    found = delete_report(report_id)
    if not found:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"success": True}
