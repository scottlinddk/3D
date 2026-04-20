"""SQLite-backed model history store."""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

_DATA_DIR = Path(os.environ.get("CURVEEXTRACT_DATA_DIR", Path.home() / ".curveextract"))
_DB_PATH = _DATA_DIR / "history.db"


def _connect() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS model_history (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT    NOT NULL DEFAULT 'Untitled',
                points     TEXT    NOT NULL,
                height     REAL    NOT NULL,
                revolve    INTEGER NOT NULL DEFAULT 0,
                format     TEXT    NOT NULL DEFAULT 'stl',
                paper_size TEXT    NOT NULL DEFAULT 'A4',
                created_at TEXT    NOT NULL
            )
        """)


def save_model(
    *,
    name: str,
    points: list[list[float]],
    height: float,
    revolve: bool,
    format: str,
    paper_size: str,
) -> int:
    now = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO model_history (name, points, height, revolve, format, paper_size, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (name, json.dumps(points), height, int(revolve), format, paper_size, now),
        )
        return cur.lastrowid  # type: ignore[return-value]


def list_models(limit: int = 100) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM model_history ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["points"] = json.loads(d["points"])
        d["revolve"] = bool(d["revolve"])
        result.append(d)
    return result


def delete_model(entry_id: int) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM model_history WHERE id = ?", (entry_id,))
        return cur.rowcount > 0
