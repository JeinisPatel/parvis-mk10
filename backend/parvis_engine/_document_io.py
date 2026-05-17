"""
Document I/O helpers — bridge between Mk 9's FastAPI UploadFile and Mk 8's
Streamlit-shaped file object expected by document_analyzer.extract_text_from_upload().

Storage convention:
  - Uploaded files persist under backend/data/uploads/{case_slug}/{file_id}_{original_name}
  - case_slug is derived from the profile's caseReference, lowercased + alphanumeric
  - file_id is a short URL-safe hash, so collisions are vanishingly unlikely
  - Files persist across backend restarts (Phase A.5 swaps for Supabase Storage)

This module is a Mk 9 helper, not a Mk 8 engine file.
"""

from __future__ import annotations

import hashlib
import re
from io import BytesIO
from pathlib import Path


def _project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "backend").is_dir() and (parent / "frontend").is_dir():
            return parent
        if parent.name == "backend":
            return parent.parent
    return here.parent.parent.parent


UPLOAD_ROOT = _project_root() / "backend" / "data" / "uploads"


def _safe_slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "case").lower()).strip("-")
    return (s or "case")[:40]


def storage_path_for(
    case_reference: str,
    file_id: str,
    original_filename: str,
    session_id: str | None = None,
) -> Path:
    base = UPLOAD_ROOT
    if session_id:
        base = base / _safe_slug(session_id)
    case_dir = base / _safe_slug(case_reference)
    case_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", original_filename)[:120]
    return case_dir / f"{file_id}_{safe_name}"


def make_file_id(content: bytes, filename: str) -> str:
    h = hashlib.sha256()
    h.update(filename.encode("utf-8", errors="ignore"))
    h.update(b"\x00")
    h.update(content[:8192])
    return h.hexdigest()[:12]


class _ShimUpload:
    def __init__(self, name: str, content: bytes):
        self.name = name
        self._buf = BytesIO(content)
        self._read = False

    def read(self) -> bytes:
        if self._read:
            return b""
        self._read = True
        return self._buf.getvalue()


def extract_text(filename: str, content: bytes) -> tuple[str, str]:
    try:
        from parvis_engine.document_analyzer import extract_text_from_upload
    except ImportError as e:
        raise RuntimeError(f"document_analyzer.py not available in parvis_engine: {e}")
    return extract_text_from_upload(_ShimUpload(filename, content))