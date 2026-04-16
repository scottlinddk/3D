"""Temporary file storage and processing state management."""
import uuid
import shutil
from pathlib import Path
from typing import Literal

_BASE = Path("/tmp/curve_extraction")
_BASE.mkdir(parents=True, exist_ok=True)

Status = Literal["pending", "processing", "ready", "error"]

_status: dict[str, tuple[Status, str | None]] = {}


def new_token() -> str:
    return uuid.uuid4().hex


def upload_dir(token: str) -> Path:
    d = _BASE / token
    d.mkdir(parents=True, exist_ok=True)
    return d


def image_path(token: str) -> Path:
    return upload_dir(token) / "original.jpg"


def output_path(token: str, fmt: str) -> Path:
    return upload_dir(token) / f"model.{fmt}"


def set_status(token: str, status: Status, message: str | None = None) -> None:
    _status[token] = (status, message)


def get_status(token: str) -> tuple[Status, str | None]:
    return _status.get(token, ("pending", None))


def cleanup(token: str) -> None:
    d = _BASE / token
    if d.exists():
        shutil.rmtree(d)
    _status.pop(token, None)
