"""Liveness probe. Used by deploy targets (Fly.io, Render) for health checks.

Also reports which engine is loaded — useful in dev to confirm at a glance
whether the real Mk 8 engine or the stub is currently serving requests.
"""

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict[str, object]:
    return {
        "ok":     True,
        "engine": getattr(request.app.state, "engine_kind", "uninitialised"),
    }
