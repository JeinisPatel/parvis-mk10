"""
PARVIS Mark 9 — FastAPI entry point.

This file is intentionally thin. Each /api/v1/* route lives in its own
module under api/v1/. The Bayesian engine is imported once, lazily, by
the modules that need it; we never construct it at app-startup so that
the API surface stays responsive even if pgmpy reloads slowly during
development.

Run locally:
    uvicorn main:app --reload --port 8000

CORS is wide-open in dev. In production (Phase D) it should be locked
to the frontend's deployed origin via the FRONTEND_ORIGIN env var.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1 import architecture, health, inference, quantum, record_analysis, documents, document_analysis, intake_chat
from api.v1 import sce
from api.v1 import gladue
from api.v1 import audit
from core.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eager-load the Bayesian network on startup so the first request
    isn't penalised with a slow pgmpy import. The model is cached on the
    app.state object so route handlers can reuse it via Depends-style
    access (see api/v1/inference.py).

    Falls back to `parvis_engine._stub` (a deterministic placeholder) when
    the real `parvis_engine.model` isn't present yet — so the scaffold can
    be verified end-to-end before the Mk 8 files are copied in. `app.state.engine_kind`
    records which one was loaded so the health endpoint can surface it.
    """
    print(f"[mk9] booting · {settings.app_name} {settings.version}")
    try:
        from parvis_engine import build_model, get_inference_engine
        app.state.engine_kind = "model"
    except ImportError:
        from parvis_engine._stub import build_model, get_inference_engine
        app.state.engine_kind = "stub"
        print("[mk9] ⚠️  using stub engine — copy your Mk 8 files into parvis_engine/ to activate the real model")

    app.state.model = build_model()
    app.state.engine = get_inference_engine(app.state.model)
    print(f"[mk9] {app.state.engine_kind} engine ready · {len(app.state.model.nodes())} nodes loaded")
    yield
    print("[mk9] shutting down")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "PARVIS Mark 9 — Bayesian sentencing audit. Research prototype. "
        "Not for deployment in live proceedings."
    ),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ────────────────────────────────────────────────────────────────
# Dev: any origin. Prod: lock to FRONTEND_ORIGIN.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──────────────────────────────────────────────────────────────
app.include_router(health.router,       prefix="/api/v1")
app.include_router(architecture.router, prefix="/api/v1")
app.include_router(inference.router,    prefix="/api/v1")
app.include_router(quantum.router,      prefix="/api/v1")
app.include_router(record_analysis.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(document_analysis.router, prefix="/api/v1")
app.include_router(intake_chat.router, prefix="/api/v1")
app.include_router(gladue.router)
app.include_router(sce.router)
app.include_router(audit.router)

@app.get("/")
async def root() -> dict[str, str]:
    """Sanity check — point your browser here to confirm the server is up."""
    return {
        "service": settings.app_name,
        "version": settings.version,
        "docs":    "/api/docs",
    }
