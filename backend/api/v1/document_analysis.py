"""
POST /api/v1/documents/analyze — run the Mk 8 Tetrad-grounded document
analyzer against a previously uploaded document, using an API key passed
via request header (NOT environment variable).

Header contract:
  X-Parvis-Api-Provider:  'anthropic' | 'openai' | 'gemini'   (default anthropic)
  X-Parvis-Api-Key:       <provider's raw API key>

The key is used once per request and never persisted on the server.
When no key is provided, returns a graceful 'analyzer unavailable' response
with HTTP 200 (NOT an error) so the frontend can render a 'configure key'
prompt without treating it as a fault.

The endpoint also wires stare_decisis.infer_document_jurisdiction() — the
analyzer calls it internally, but we expose the result at the top level
so the frontend can render jurisdiction-aware authority chips before the
LLM analysis returns.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from parvis_engine._document_io import (
    UPLOAD_ROOT,
    extract_text,
    storage_path_for,
    _safe_slug,
)

router = APIRouter()


# Frontend provider name → Mk 8 analyzer provider name
_PROVIDER_MAP = {
    "anthropic": "claude",
    "openai":    "openai",
    "gemini":    "gemini",
}


# ── Schemas ──────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    case_reference: str
    file_id:        str


class NodeImplication(BaseModel):
    node_id:    str
    delta:      float
    confidence: float
    direction:  str
    reasoning:  str
    citations:  list[str]


class StareDecisisBlock(BaseModel):
    document_jurisdiction: Optional[str] = None
    document_court_level:  Optional[str] = None
    jurisdiction_source:   str = "undetermined"
    inter_provincial_splits: list[dict[str, Any]] = []
    auto_detection: Optional[dict[str, Any]] = None


class AnalyzeResponse(BaseModel):
    file_id:           str
    case_reference:    str
    inferred_doc_type: str
    analyzer_status:   str   # 'completed' | 'no_key' | 'failed'
    error:             Optional[str] = None
    provider:          Optional[str] = None
    document_summary:  Optional[str] = None
    applicable_framework: Optional[str] = None
    connection_assessment: Optional[str] = None
    doctrinal_flags:   list[str] = []
    ewert_concern:     bool = False
    nodes:             list[NodeImplication] = []
    stare_decisis:     Optional[StareDecisisBlock] = None
    jurisdiction_inference: Optional[dict[str, Any]] = None


# ── Manifest re-read (keep separate from documents.py to avoid coupling) ─────

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


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/documents/analyze", response_model=AnalyzeResponse)
async def analyze_document(
    body: AnalyzeRequest,
    x_parvis_api_key:      Optional[str] = Header(default=None),
    x_parvis_api_provider: Optional[str] = Header(default="anthropic"),
) -> AnalyzeResponse:
    # 1. Locate the previously uploaded document.
    manifest = _read_manifest(body.case_reference)
    record = next((m for m in manifest if m["file_id"] == body.file_id), None)
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"No document with file_id={body.file_id} for case {body.case_reference}.",
        )

    target = storage_path_for(body.case_reference, body.file_id, record["filename"])
    if not target.is_file():
        raise HTTPException(status_code=410, detail="File no longer on disk.")

    # 2. Re-extract text from disk (cheap; Mk 8 caps at 15k chars).
    raw = target.read_bytes()
    try:
        text, doc_type = extract_text(record["filename"], raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {e}")

    # 3. Run jurisdiction inference unconditionally (no LLM, regex-only).
    jurisdiction_inference = None
    try:
        from parvis_engine.stare_decisis import infer_document_jurisdiction
        jurisdiction_inference = infer_document_jurisdiction(text)
    except Exception:
        jurisdiction_inference = None

    # 4. If no API key, return graceful degraded response.
    if not x_parvis_api_key:
        return AnalyzeResponse(
            file_id=body.file_id,
            case_reference=body.case_reference,
            inferred_doc_type=doc_type,
            analyzer_status="no_key",
            error=None,
            jurisdiction_inference=jurisdiction_inference,
        )

    # 5. Map frontend provider name → Mk 8 provider name.
    fe_provider = (x_parvis_api_provider or "anthropic").lower()
    mk8_provider = _PROVIDER_MAP.get(fe_provider, "claude")

    # 6. Run the analyzer.
    try:
        from parvis_engine.document_analyzer import analyze_document as mk8_analyze
        raw_result = mk8_analyze(
            content=text,
            doc_type=doc_type,
            api_key=x_parvis_api_key,
            provider=mk8_provider,
        )
    except Exception as e:
        return AnalyzeResponse(
            file_id=body.file_id,
            case_reference=body.case_reference,
            inferred_doc_type=doc_type,
            analyzer_status="failed",
            error=f"Analyzer crashed: {e}",
            jurisdiction_inference=jurisdiction_inference,
        )

    # 7. Mk 8 returns 'error' key on analyzer failure (parse error, API error)
    if raw_result.get("error"):
        return AnalyzeResponse(
            file_id=body.file_id,
            case_reference=body.case_reference,
            inferred_doc_type=doc_type,
            analyzer_status="failed",
            error=raw_result.get("error"),
            provider=fe_provider,
            document_summary=raw_result.get("document_summary"),
            jurisdiction_inference=jurisdiction_inference,
        )

    # 8. Transform Mk 8's nodes dict into a list of NodeImplication.
    node_implications: list[NodeImplication] = []
    nodes_dict = raw_result.get("nodes", {}) or {}
    for nid_str, entry in nodes_dict.items():
        delta = float(entry.get("delta", 0) or 0)
        if abs(delta) < 0.01:
            continue  # skip nodes with negligible impact
        direction = entry.get("direction") or (
            "increases_risk" if delta > 0 else
            "reduces_risk"   if delta < 0 else ""
        )
        node_implications.append(NodeImplication(
            node_id=str(nid_str),
            delta=delta,
            confidence=float(entry.get("confidence", 0) or 0),
            direction=direction,
            reasoning=str(entry.get("reasoning", "") or "")[:500],
            citations=list(entry.get("citations", []) or []),
        ))
    # Sort by absolute delta * confidence descending so the strongest go first.
    node_implications.sort(
        key=lambda n: abs(n.delta) * n.confidence,
        reverse=True,
    )

    # 9. Stare decisis block.
    sd_raw = raw_result.get("stare_decisis", {}) or {}
    stare_decisis = StareDecisisBlock(
        document_jurisdiction=sd_raw.get("document_jurisdiction"),
        document_court_level=sd_raw.get("document_court_level"),
        jurisdiction_source=sd_raw.get("jurisdiction_source", "undetermined"),
        inter_provincial_splits=list(sd_raw.get("inter_provincial_splits", []) or []),
        auto_detection=sd_raw.get("auto_detection"),
    )

    return AnalyzeResponse(
        file_id=body.file_id,
        case_reference=body.case_reference,
        inferred_doc_type=doc_type,
        analyzer_status="completed",
        provider=fe_provider,
        document_summary=raw_result.get("document_summary"),
        applicable_framework=raw_result.get("applicable_framework"),
        connection_assessment=raw_result.get("connection_assessment"),
        doctrinal_flags=list(raw_result.get("doctrinal_flags", []) or []),
        ewert_concern=bool(raw_result.get("ewert_concern", False)),
        nodes=node_implications,
        stare_decisis=stare_decisis,
        jurisdiction_inference=jurisdiction_inference,
    )
