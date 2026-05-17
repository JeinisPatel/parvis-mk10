"""
PARVIS Mk 9 - Audit report API.

POST /api/v1/audit/generate - generate a DOCX or PDF audit report from
current case state, returning the file as a binary download.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from parvis_engine._audit_report import (
    ALL_SECTIONS,
    build_audit_docx,
    build_audit_pdf,
)


router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


class AuditGenerateRequest(BaseModel):
    format: Literal["docx", "pdf"] = "docx"
    sections: list[str] | None = None
    case_reference: str | None = None
    profile: dict[str, Any] | None = None
    documents: list[dict[str, Any]] | None = None
    intake_extracted: dict[str, Any] | None = None
    evidence: dict[str, Any] | None = None
    inference: dict[str, Any] | None = None
    gladue: dict[str, Any] | None = None
    sce: dict[str, Any] | None = None
    node_labels: dict[str, str] | None = None


def _slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text.strip("-") or "case"


@router.post("/generate")
def generate_audit(req: AuditGenerateRequest):
    # Validate sections
    if req.sections is not None:
        invalid = [s for s in req.sections if s not in ALL_SECTIONS]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid section name(s): {', '.join(invalid)}. "
                    f"Valid: {', '.join(ALL_SECTIONS)}"
                ),
            )

    payload = {
        "case_reference": req.case_reference,
        "profile": req.profile or {},
        "documents": req.documents or [],
        "intake_extracted": req.intake_extracted or {},
        "evidence": req.evidence or {},
        "inference": req.inference or {},
        "gladue": req.gladue or {},
        "sce": req.sce or {},
        "node_labels": req.node_labels or {},
        "generated_at": datetime.utcnow().isoformat(),
    }

    try:
        if req.format == "pdf":
            content = build_audit_pdf(payload, req.sections)
            media_type = "application/pdf"
            ext = "pdf"
        else:
            content = build_audit_docx(payload, req.sections)
            media_type = (
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            )
            ext = "docx"
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {type(e).__name__}: {e}",
        )

    # Filename: prefer case_reference slug, then family/given name, else 'case'
    case_slug = _slugify(req.case_reference or "")
    profile = req.profile or {}
    name_slug = _slugify(profile.get("familyName") or profile.get("givenName") or "")

    if case_slug and case_slug != "case":
        slug = case_slug
    elif name_slug and name_slug != "case":
        slug = name_slug
    else:
        slug = "case"

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M")
    filename = f"parvis-audit-{slug}-{timestamp}.{ext}"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(content)),
        },
    )
