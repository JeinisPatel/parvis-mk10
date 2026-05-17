"""
GET /api/v1/architecture
========================

Returns the canonical Bayesian-network structure for the frontend's
Architecture / network-graph view. Pure pass-through of the engine's
NODE_META and EDGES_VE — no transformation.

Response:
    {
      "nodes": [
        { "id": "1", "name": "Criminal law burden of proof",
          "short": "Burden of proof", "type": "constraint",
          "evidence_bearing": false },
        ...
      ],
      "edges": [
        { "from": "1", "to": "2" },
        ...
      ]
    }

The frontend's `lib/nodes.ts` is a static mirror of this for offline /
build-time use; the live endpoint is the source of truth.
"""

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()


class NodeOut(BaseModel):
    id:                str
    name:              str
    short:             str
    type:              str
    evidence_bearing:  bool


class EdgeOut(BaseModel):
    # `from` is a Python reserved word, so the field name is `from_` and we
    # alias it to `from` on the wire. `populate_by_name=True` lets us still
    # construct EdgeOut with kwargs by either name.
    from_: str = Field(alias="from")
    to:    str

    model_config = ConfigDict(populate_by_name=True)


class ArchitectureResponse(BaseModel):
    nodes: list[NodeOut]
    edges: list[EdgeOut]


def _load_engine_module():
    """Prefer the real engine; fall back to the stub if Mk 8 isn't copied in yet."""
    try:
        import parvis_engine as engine_module
    except ImportError:
        from parvis_engine import _stub as engine_module
    return engine_module


@router.get(
    "/architecture",
    response_model=ArchitectureResponse,
    response_model_by_alias=True,
)
async def get_architecture() -> ArchitectureResponse:
    engine = _load_engine_module()

    nodes = [
        NodeOut(
            id=str(nid),
            name=meta["name"],
            short=meta["short"],
            type=meta["type"],
            evidence_bearing=meta.get("ev", False),
        )
        for nid, meta in engine.NODE_META.items()
    ]
    edges = [EdgeOut(from_=str(a), to=str(b)) for a, b in engine.EDGES_VE]

    return ArchitectureResponse(nodes=nodes, edges=edges)
