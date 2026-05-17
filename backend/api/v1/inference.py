"""
POST /api/v1/inference            — hard evidence only (binary toggles)
POST /api/v1/inference/soft       — hard evidence + soft posterior shifts
POST /api/v1/inference/decompose  — same as /soft, plus the family decomposition
                                    of the final DO risk

The /soft endpoint generalises the pattern established by Mark 8's
counterfactual_audit.apply_conditions(): run VE with hard evidence, then
apply additive shifts to specific node posteriors before computing the
final DO risk via compute_do_risk().

The /decompose endpoint additionally returns the per-family contribution
to the final DO risk. The weights mirror those in Mk 8's compute_do_risk()
and are sourced from Ch.5 §5.1.20. If model.py's weights change, the
DECOMPOSITION_WEIGHTS below must be updated in lockstep — flagged as a
known Phase C improvement: refactor compute_do_risk to return its own
decomposition natively.

Doctrinal anchor: Ch.5 §5.1.20 + counterfactual audit panel specification.
"""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class InferenceRequest(BaseModel):
    """Hard evidence only. Identical to Mk 8's query_do_risk evidence dict."""

    evidence: dict[str, Annotated[int, Field(ge=0, le=1)]] = Field(
        default_factory=dict,
        description="Observed node states (0 or 1). Missing nodes are marginalised.",
    )
    collider_discount: bool = Field(
        default=False,
        description=(
            "Apply §5.1.19 §8 collider-bias discount to a secondary DO reading. "
            "Headline DO risk is always returned unmodified."
        ),
    )


class SoftInferenceRequest(BaseModel):
    """Hard evidence + additive posterior shifts.

    The toggle in the UI sends a 0/1 to `evidence`. The slider sends a
    signed shift to `shifts` representing the practitioner's deviation
    from the engine's neutral posterior for that node. Shifts apply
    post-VE and are clipped to [0.05, 0.95] before the DO risk formula
    runs — matching counterfactual_audit.apply_conditions().
    """

    evidence: dict[str, Annotated[int, Field(ge=0, le=1)]] = Field(
        default_factory=dict,
        description="Hard-evidence node states (0 or 1).",
    )
    shifts: dict[str, Annotated[float, Field(ge=-0.45, le=0.45)]] = Field(
        default_factory=dict,
        description=(
            "Signed additive shifts per node, applied post-VE. "
            "Positive raises the posterior toward 1.0; negative lowers it. "
            "Clipped to [0.05, 0.95] after summation. Range [-0.45, 0.45] "
            "matches counterfactual_audit's magnitude bounds."
        ),
    )
    collider_discount: bool = Field(default=False)


class InferenceResponse(BaseModel):
    posteriors:                  dict[str, float]
    do_risk:                      float
    do_risk_collider_discounted:  float | None
    completeness:                 dict[str, int]
    shifts_applied:               dict[str, float] | None = None


class FamilyContribution(BaseModel):
    """Per-family contribution to the final DO risk.

    `weight_sum` — sum of (node_weight × node_posterior) over family members.
    `signed_contribution` — same number, with a sign reflecting whether the
                            family pushes risk up (positive) or down (negative)
                            per Ch.5 §5.1.20.
    `nodes` — per-node breakdown for drill-down.
    """
    family:               str
    label:                str
    color:                str
    sign:                 str             # 'up' | 'down'
    weight_sum:           float
    signed_contribution:  float
    nodes: list[dict] = Field(default_factory=list)


class DecomposedInferenceResponse(InferenceResponse):
    families:           list[FamilyContribution]
    saturated_nodes:    list[str]
    provenance:          str


# ── Evidence-node taxonomy (matches lib/nodes.ts EVIDENCE_NODE_IDS) ──────────

EVIDENCE_NODES: frozenset[str] = frozenset({
    "2", "3", "4", "5", "6", "7", "9", "10", "11", "12", "13", "14", "15", "18",
})


# ── Decomposition weights (mirror of model.compute_do_risk) ──────────────────
# Each entry: (family_label, sign, {node_id: weight})
# Weights extracted from the Mk 8 model.compute_do_risk body. If those change,
# this map MUST be updated in lockstep — see TODO at top of file.

DECOMPOSITION_WEIGHTS: dict[str, dict] = {
    "risk": {
        "label":  "Substantive risk",
        "color":  "#A32D2D",
        "sign":   "up",
        "nodes":  { "2": 0.30, "3": 0.25, "4": 0.20, "18": 0.18 },
    },
    "distortion": {
        "label":  "Systemic distortions",
        "color":  "#185FA5",
        "sign":   "down",   # distortions reduce the record-reliability multiplier
        "nodes":  {
            "5":  0.18,
            "6":  0.12,
            "7":  0.35,    # bail-WCGP — heaviest record-reliability hit
            "11": 0.10,
            "12": 0.25,
            "14": 0.30,
            "15": 0.10,
            "17": 0.30,
        },
    },
    "mitigation": {
        "label":  "Mitigations",
        "color":  "#3B6D11",
        "sign":   "down",
        "nodes":  { "10": 0.20 },
    },
    "dual": {
        "label":  "Dual-factor",
        "color":  "#534AB7",
        "sign":   "down",
        "nodes":  { "9": 0.15 },
    },
    "special": {
        "label":  "Detectors",
        "color":  "#0F6E56",
        "sign":   "down",
        "nodes":  { "13": 0.10 },
    },
    "constraint": {
        "label":  "Constraints",
        "color":  "#BA7517",
        "sign":   "down",
        "nodes":  { "1": 0.05 },
    },
}


PROVENANCE_NOTE = (
    "Decomposition weights mirror those in Mk 8 model.compute_do_risk per "
    "Ch.5 §5.1.20. Re-derive if compute_do_risk is updated."
)


# ── Engine resolution (real or stub) ─────────────────────────────────────────

def _compute_do_risk(posteriors: dict[str, float], collider_discount: bool) -> float:
    try:
        from parvis_engine import compute_do_risk
    except ImportError:
        from parvis_engine._stub import compute_do_risk
    return compute_do_risk(posteriors, collider_discount=collider_discount)


# ── Core VE pass shared by all endpoints ─────────────────────────────────────

def _run_ve(model, engine, evidence: dict[str, int]) -> dict[str, float]:
    """Query VE for every node not in evidence; fill evidence nodes with their
    observed value. Returns posteriors keyed by string node id (all 19 — not 20).
    """
    unknown = set(evidence) - set(model.nodes())
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown node ID(s) in evidence: {sorted(unknown)}",
        )

    posteriors: dict[str, float] = {}
    for nid in model.nodes():
        if nid in evidence:
            posteriors[nid] = float(evidence[nid])
        else:
            marginal = engine.query(
                variables=[nid],
                evidence=evidence,
                show_progress=False,
            )
            posteriors[nid] = float(marginal.values[1])
    return posteriors


def _apply_shifts(
    posteriors: dict[str, float],
    shifts: dict[str, float],
) -> tuple[dict[str, float], dict[str, float]]:
    """Apply additive shifts to a copy of posteriors, clipped to [0.05, 0.95].
    Returns (shifted_posteriors, shifts_actually_applied).
    """
    shifted = dict(posteriors)
    applied: dict[str, float] = {}
    for nid, raw_shift in shifts.items():
        if nid not in shifted or nid == "20":
            continue
        old = shifted[nid]
        new = max(0.05, min(0.95, old + raw_shift))
        shifted[nid] = new
        applied[nid] = new - old
    return shifted, applied


def _completeness(evidence: dict[str, int]) -> dict[str, int]:
    return {
        "observed":             len(set(evidence) & EVIDENCE_NODES),
        "total_evidence_nodes": len(EVIDENCE_NODES),
    }


def _decompose(posteriors: dict[str, float]) -> list[dict]:
    """Compute per-family contribution to the DO risk.

    Each family's `weight_sum` is the dot product of its node weights with
    the posteriors. `signed_contribution` carries the family's directional
    sign (risk pushes up; distortion/mitigation/dual/special/constraint pull
    down) — see Ch.5 §5.1.20.
    """
    families: list[dict] = []
    for family_id, fam in DECOMPOSITION_WEIGHTS.items():
        sign_mult = 1.0 if fam["sign"] == "up" else -1.0
        weight_sum = 0.0
        per_node: list[dict] = []
        for nid, w in fam["nodes"].items():
            p = float(posteriors.get(nid, 0.0))
            contribution = w * p
            weight_sum += contribution
            per_node.append({
                "id":           nid,
                "weight":       w,
                "posterior":    p,
                "contribution": contribution,
            })
        per_node.sort(key=lambda r: r["contribution"], reverse=True)
        families.append({
            "family":              family_id,
            "label":               fam["label"],
            "color":               fam["color"],
            "sign":                fam["sign"],
            "weight_sum":          round(weight_sum, 6),
            "signed_contribution": round(weight_sum * sign_mult, 6),
            "nodes":               per_node,
        })
    # Sort by magnitude of signed contribution, descending.
    families.sort(key=lambda f: abs(f["signed_contribution"]), reverse=True)
    return families


def _saturated_nodes(posteriors: dict[str, float]) -> list[str]:
    """Return ids of nodes saturated at the 0.05/0.95 boundaries."""
    return [
        nid for nid, p in posteriors.items()
        if nid != "20" and (p <= 0.0501 or p >= 0.9499)
    ]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/inference", response_model=InferenceResponse)
async def run_inference(req: InferenceRequest, request: Request) -> InferenceResponse:
    """Hard-evidence inference. Run VE, compute Node 20 via compute_do_risk."""
    model  = request.app.state.model
    engine = request.app.state.engine

    posteriors = _run_ve(model, engine, req.evidence)

    do_risk = _compute_do_risk(
        {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
        collider_discount=False,
    )
    do_risk_cd: float | None = None
    if req.collider_discount:
        do_risk_cd = _compute_do_risk(
            {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
            collider_discount=True,
        )

    posteriors["20"] = do_risk

    return InferenceResponse(
        posteriors=posteriors,
        do_risk=do_risk,
        do_risk_collider_discounted=do_risk_cd,
        completeness=_completeness(req.evidence),
    )


@router.post("/inference/soft", response_model=InferenceResponse)
async def run_soft_inference(req: SoftInferenceRequest, request: Request) -> InferenceResponse:
    """Soft-evidence inference. Run VE with hard evidence, then apply
    additive shifts post-VE before recomputing Node 20."""
    model  = request.app.state.model
    engine = request.app.state.engine

    posteriors = _run_ve(model, engine, req.evidence)
    posteriors, applied = _apply_shifts(posteriors, req.shifts)

    do_risk = _compute_do_risk(
        {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
        collider_discount=False,
    )
    do_risk_cd: float | None = None
    if req.collider_discount:
        do_risk_cd = _compute_do_risk(
            {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
            collider_discount=True,
        )

    posteriors["20"] = do_risk

    return InferenceResponse(
        posteriors=posteriors,
        do_risk=do_risk,
        do_risk_collider_discounted=do_risk_cd,
        completeness=_completeness(req.evidence),
        shifts_applied=applied,
    )


@router.post("/inference/decompose", response_model=DecomposedInferenceResponse)
async def run_decomposed_inference(req: SoftInferenceRequest, request: Request) -> DecomposedInferenceResponse:
    """Soft-evidence inference + per-family contribution decomposition.

    Used by the Inference page. Returns everything /soft does, plus a
    breakdown of which family of nodes contributed how much to N20 per
    Ch.5 §5.1.20, plus the list of nodes saturated at the [0.05, 0.95]
    boundaries.
    """
    model  = request.app.state.model
    engine = request.app.state.engine

    posteriors = _run_ve(model, engine, req.evidence)
    posteriors, applied = _apply_shifts(posteriors, req.shifts)

    do_risk = _compute_do_risk(
        {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
        collider_discount=False,
    )
    do_risk_cd: float | None = None
    if req.collider_discount:
        do_risk_cd = _compute_do_risk(
            {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
            collider_discount=True,
        )

    posteriors["20"] = do_risk
    families = _decompose(
        {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"}
    )
    saturated = _saturated_nodes(posteriors)

    return DecomposedInferenceResponse(
        posteriors=posteriors,
        do_risk=do_risk,
        do_risk_collider_discounted=do_risk_cd,
        completeness=_completeness(req.evidence),
        shifts_applied=applied,
        families=[FamilyContribution(**f) for f in families],
        saturated_nodes=saturated,
        provenance=PROVENANCE_NOTE,
    )