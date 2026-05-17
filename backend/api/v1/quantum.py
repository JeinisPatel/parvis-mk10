"""
POST /api/v1/quantum
====================

Returns the full QBism diagnostic suite plus the Bloch sphere angles for
the current evidence. Composes:

  - quantum_diagnostics.diagnose() the six-axis diagnostic suite
    (prior contamination, order effects, contextual interference, belief
    stasis, order stability, connection-gate contextuality, plus the
    superposition index)
  - bloch_sphere.compute_bloch_angles() theta, phi, x, y, z for the state vector

This is the only endpoint that returns the Bloch geometry. The frontend
renders the sphere in Three.js using the angles; matplotlib never runs in
the API path.

Doctrinal anchors: Appendix Q sections AQ.3.3.2 through AQ.3.3.5.
"""

from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter()


# Request

class QuantumRequest(BaseModel):
    evidence: dict[str, Annotated[int, Field(ge=0, le=1)]] = Field(
        default_factory=dict,
        description="Hard-evidence node states (0 or 1).",
    )
    shifts: dict[str, Annotated[float, Field(ge=-0.45, le=0.45)]] = Field(
        default_factory=dict,
        description="Signed additive shifts per node, applied post-VE.",
    )
    gladue_checked: list[str] = Field(
        default_factory=list,
        description="IDs of checked Gladue factors (from a future Gladue page).",
    )
    sce_checked: list[str] = Field(
        default_factory=list,
        description="IDs of checked Morris/Ellis SCE factors (from a future SCE page).",
    )
    profile_ev: dict[str, float] = Field(
        default_factory=dict,
        description=(
            "Case-profile-derived prior evidence per node, as posterior probabilities."
        ),
    )
    connection_strength: str = Field(
        default="moderate",
        description="Morris para 97 connection gate: weak | moderate | strong.",
    )


# Response

class BlochAngles(BaseModel):
    theta:  float
    phi:    float
    x:      float
    y:      float
    z:      float


class DiagnosticAxis(BaseModel):
    flagged:   bool
    severity:  str
    items:     list[Any] | None = None
    doctrine:  str | None = None
    note:      str | None = None
    delta:     float | None = None
    permutations:  list[Any] | None = None
    gates_tested:  list[Any] | None = None


class QuantumResponse(BaseModel):
    do_risk:              float
    p_high:               float
    classical_posteriors: dict[str, float]

    angles:               BlochAngles

    prior_contamination:           DiagnosticAxis
    order_effects:                 DiagnosticAxis
    contextual_interference:       DiagnosticAxis
    belief_stasis:                 DiagnosticAxis
    order_stability:               DiagnosticAxis
    connection_gate_contextuality: DiagnosticAxis

    superposition_index:  float
    superposition_note:   str
    overall_flag:         str
    summary:              str


# Engine resolution

def _compute_do_risk(posteriors: dict[str, float], collider_discount: bool) -> float:
    try:
        from parvis_engine import compute_do_risk
    except ImportError:
        from parvis_engine._stub import compute_do_risk
    return compute_do_risk(posteriors, collider_discount=collider_discount)


# VE pass

def _run_ve(model, engine, evidence: dict[str, int]) -> dict[str, float]:
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
) -> dict[str, float]:
    shifted = dict(posteriors)
    for nid, raw_shift in shifts.items():
        if nid not in shifted or nid == "20":
            continue
        old = shifted[nid]
        shifted[nid] = max(0.05, min(0.95, old + raw_shift))
    return shifted


# Endpoint

@router.post("/quantum", response_model=QuantumResponse)
async def run_quantum(req: QuantumRequest, request: Request) -> QuantumResponse:
    model  = request.app.state.model
    engine = request.app.state.engine

    posteriors = _run_ve(model, engine, req.evidence)
    posteriors = _apply_shifts(posteriors, req.shifts)
    do_risk = _compute_do_risk(
        {k: v for k, v in posteriors.items() if k.isdigit() and k != "20"},
        collider_discount=False,
    )
    posteriors["20"] = do_risk

    posteriors_int: dict[int, float] = {
        int(k): v for k, v in posteriors.items() if k.isdigit()
    }
    profile_ev_int: dict[int, float] = {
        int(k): v for k, v in req.profile_ev.items() if k.isdigit()
    }

    try:
        from parvis_engine.quantum_diagnostics import diagnose
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "quantum_diagnostics.py not available in parvis_engine package. "
                f"Original error: {e}"
            ),
        )

    diags = diagnose(
        posteriors=posteriors_int,
        evidence={k: int(v) for k, v in req.evidence.items()},
        gladue_checked=req.gladue_checked,
        sce_checked=req.sce_checked,
        profile_ev=profile_ev_int,
        connection_strength=req.connection_strength,
        engine=engine,
    )

    try:
        from parvis_engine.bloch_sphere import compute_bloch_angles
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"bloch_sphere.py not available: {e}",
        )

    risk_weight = sum(
        posteriors_int.get(n, 0.0) for n in (2, 3, 4, 18)
    ) / 4.0
    mitigation_weight = sum(
        posteriors_int.get(n, 0.0) for n in (9, 10)
    ) / 2.0

    theta, phi, x, y, z = compute_bloch_angles(
        p_high=do_risk,
        risk_weight=risk_weight,
        mitigation_weight=mitigation_weight,
    )

    return QuantumResponse(
        do_risk=do_risk,
        p_high=do_risk,
        classical_posteriors=posteriors,
        angles=BlochAngles(
            theta=float(theta),
            phi=float(phi),
            x=float(x),
            y=float(y),
            z=float(z),
        ),
        prior_contamination=DiagnosticAxis(**diags["prior_contamination"]),
        order_effects=DiagnosticAxis(**diags["order_effects"]),
        contextual_interference=DiagnosticAxis(**diags["contextual_interference"]),
        belief_stasis=DiagnosticAxis(**diags["belief_stasis"]),
        order_stability=DiagnosticAxis(**diags["order_stability"]),
        connection_gate_contextuality=DiagnosticAxis(**diags["connection_gate_contextuality"]),
        superposition_index=diags["superposition_index"],
        superposition_note=diags["superposition_note"],
        overall_flag=diags["overall_flag"],
        summary=diags["summary"],
    )