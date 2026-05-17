"""
POST /api/v1/documents/upload   — upload + extract text from a document
GET  /api/v1/documents/list     — list uploaded documents for a case
DELETE /api/v1/documents/{id}   — remove an uploaded file
GET  /api/v1/documents/file/{id} — fetch a previously uploaded file

Files persist to backend/data/uploads/{case-slug}/. Storage is on local disk
for Phase B; Phase A.5 will swap the storage layer for Supabase Storage.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from parvis_engine._document_io import (
    UPLOAD_ROOT,
    extract_text,
    make_file_id,
    storage_path_for,
    _safe_slug,
)

router = APIRouter()


class UploadResponse(BaseModel):
    file_id:           str
    filename:          str
    size_bytes:        int
    inferred_doc_type: str
    extracted_text:    str
    text_was_truncated: bool
    uploaded_at:       str
    case_reference:    str


class DocumentRecord(BaseModel):
    file_id:           str
    filename:          str
    size_bytes:        int
    inferred_doc_type: str
    uploaded_at:       str


class ListResponse(BaseModel):
    case_reference:  str
    documents:       list[DocumentRecord]


def _manifest_path(case_reference: str) -> Path:
    return UPLOAD_ROOT / _safe_slug(case_reference) / "_manifest.json"


def _read_manifest(case_reference: str) -> list[dict[str, Any]]:
    p = _manifest_path(case_reference)
    if not p.is_file():
        return []
    try:
        return json.loads(p.read_text())
    except Exception:
        return []


def _write_manifest(case_reference: str, items: list[dict[str, Any]]) -> None:
    p = _manifest_path(case_reference)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(items, indent=2))


@router.post("/documents/upload", response_model=UploadResponse)
async def upload_document(
    case_reference: str = Form(...),
    file: UploadFile = File(...),
) -> UploadResponse:
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(raw) / 1_000_000:.1f} MB). Limit is 20 MB.",
        )

    filename = file.filename or "upload"
    file_id  = make_file_id(raw, filename)
    target   = storage_path_for(case_reference, file_id, filename)
    target.write_bytes(raw)

    try:
        text, doc_type = extract_text(filename, raw)
    except Exception as e:
        text     = f"[Text extraction failed: {e}]"
        doc_type = "Extraction failed"

    truncated = len(text) >= 15000

    manifest = _read_manifest(case_reference)
    manifest = [m for m in manifest if m.get("file_id") != file_id]
    record = {
        "file_id":           file_id,
        "filename":          filename,
        "size_bytes":        len(raw),
        "inferred_doc_type": doc_type,
        "uploaded_at":       datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    manifest.append(record)
    _write_manifest(case_reference, manifest)

    return UploadResponse(
        file_id=file_id,
        filename=filename,
        size_bytes=len(raw),
        inferred_doc_type=doc_type,
        extracted_text=text,
        text_was_truncated=truncated,
        uploaded_at=record["uploaded_at"],
        case_reference=case_reference,
    )


@router.get("/documents/list", response_model=ListResponse)
async def list_documents(case_reference: str) -> ListResponse:
    items = _read_manifest(case_reference)
    return ListResponse(
        case_reference=case_reference,
        documents=[DocumentRecord(**m) for m in items],
    )


@router.delete("/documents/{file_id}")
async def delete_document(file_id: str, case_reference: str) -> dict:
    manifest = _read_manifest(case_reference)
    record = next((m for m in manifest if m["file_id"] == file_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="No such document for this case.")

    target = storage_path_for(case_reference, file_id, record["filename"])
    try:
        if target.is_file():
            target.unlink()
    except Exception:
        pass

    manifest = [m for m in manifest if m["file_id"] != file_id]
    _write_manifest(case_reference, manifest)
    return {"deleted": True, "file_id": file_id}


@router.get("/documents/file/{file_id}")
async def get_file(file_id: str, case_reference: str):
    manifest = _read_manifest(case_reference)
    record = next((m for m in manifest if m["file_id"] == file_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="No such document for this case.")

    target = storage_path_for(case_reference, file_id, record["filename"])
    if not target.is_file():
        raise HTTPException(status_code=410, detail="File no longer on disk.")
    return FileResponse(
        path=str(target),
        filename=record["filename"],
        media_type="application/octet-stream",
    )