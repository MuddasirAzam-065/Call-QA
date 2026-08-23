"""
Minimal persistence layer for the "save previous QA reports / call history"
bonus feature. Uses a flat JSON file so the assignment stays dependency-light;
swap this module for a real database (Postgres, SQLite via SQLAlchemy, etc.)
in production without touching the routes.
"""
import json
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.config import settings

_lock = threading.Lock()


def _ensure_file() -> None:
    os.makedirs(os.path.dirname(settings.history_db_path) or ".", exist_ok=True)
    if not os.path.exists(settings.history_db_path):
        with open(settings.history_db_path, "w") as f:
            json.dump([], f)


def list_reports() -> List[dict]:
    _ensure_file()
    with _lock, open(settings.history_db_path, "r") as f:
        data = json.load(f)
    return sorted(data, key=lambda r: r.get("created_at", ""), reverse=True)


def save_report(report: dict) -> dict:
    _ensure_file()
    report = dict(report)
    report["id"] = report.get("id") or str(uuid.uuid4())
    report["created_at"] = report.get("created_at") or datetime.now(timezone.utc).isoformat()
    with _lock, open(settings.history_db_path, "r+") as f:
        data = json.load(f)
        data.append(report)
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()
    return report


def delete_report(report_id: str) -> bool:
    _ensure_file()
    with _lock, open(settings.history_db_path, "r+") as f:
        data = json.load(f)
        new_data = [r for r in data if r.get("id") != report_id]
        found = len(new_data) != len(data)
        f.seek(0)
        json.dump(new_data, f, indent=2)
        f.truncate()
    return found


def get_report(report_id: str) -> Optional[dict]:
    for r in list_reports():
        if r.get("id") == report_id:
            return r
    return None
