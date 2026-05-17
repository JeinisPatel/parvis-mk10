"""
parvis_engine._stub
===================

Graceful fallback engine. Used *only* when the real Mark 8 files haven't
been copied into `parvis_engine/` yet — so the FastAPI app can still boot,
the frontend can still fetch endpoints, and you can verify the scaffold
end-to-end before importing the substantive Bayesian work.

The contract mirrors `parvis_engine.model`:

    build_model()              -> _StubNetwork
    get_inference_engine(net)  -> _StubInference
    compute_do_risk(posteriors, collider_discount=False) -> float
    NODE_META                  -> dict[str, dict]
    EDGES_VE                   -> list[tuple[str, str]]

When you copy the real `model.py` into this package, `main.py` will
prefer it over the stub automatically (see the try/except in main.py).

The stub posterior is deterministic: it walks the evidence dict and
nudges the DO risk by node type (risk/distortion push up, mitigation
pulls down). It produces visible, non-degenerate numbers so the UI is
inspectable. It is **not** doctrinally meaningful.
"""
from __future__ import annotations

from typing import Iterable


# ── NODE_META — canonical Chapter 5 taxonomy ────────────────────────────────
# Mirrors the mockup's tokens.jsx and the frontend's lib/nodes.ts. The
# `ev` flag marks evidence-bearing nodes (those the practitioner observes
# directly, as opposed to derived / latent nodes).

NODE_META: dict[str, dict] = {
    "1":  {"name": "Criminal law burden of proof",                  "short": "Burden of proof",     "type": "constraint", "ev": False},
    "2":  {"name": "Validated risk elevators",                       "short": "Risk elevators",      "type": "risk",       "ev": True},
    "3":  {"name": "Sexual offence risk profile",                    "short": "Sexual offence",      "type": "risk",       "ev": True},
    "4":  {"name": "Dynamic risk factor cluster",                    "short": "Dynamic risk",        "type": "risk",       "ev": True},
    "5":  {"name": "Current risk assessment tools",                  "short": "Risk tools",          "type": "distortion", "ev": True},
    "6":  {"name": "Ineffective assistance of counsel",              "short": "IAC",                 "type": "distortion", "ev": True},
    "7":  {"name": "Bail denial → WCGP cascade",                     "short": "Bail-WCGP",           "type": "distortion", "ev": True},
    "8":  {"name": "FASD as dual-factor",                            "short": "FASD",                "type": "dual",       "ev": True},
    "9":  {"name": "Intergenerational trauma & cultural treatment",  "short": "IGT / treatment",     "type": "mitigation", "ev": True},
    "10": {"name": "Judicial misapplication of SCE",                 "short": "SCE misapplication",  "type": "distortion", "ev": True},
    "11": {"name": "Gaming risk detector",                           "short": "Gaming risk",         "type": "special",    "ev": True},
    "12": {"name": "Judicial reasoning reliability",                 "short": "Judging the judge",   "type": "distortion", "ev": False},
    "13": {"name": "Structural systemic bias (TraceRoute)",          "short": "TraceRoute",          "type": "distortion", "ev": False},
    "14": {"name": "Temporal distortion in prior records",           "short": "Temporal distortion", "type": "distortion", "ev": True},
    "15": {"name": "Interjurisdictional tariff distortion",          "short": "Tariff distortion",   "type": "distortion", "ev": False},
    "16": {"name": "Doctrinal tension (s.718.04 / 718.2(e))",        "short": "Doctrinal tension",   "type": "distortion", "ev": False},
    "17": {"name": "Over-policing & epistemic contamination",        "short": "Over-policing",       "type": "distortion", "ev": True},
    "18": {"name": "Gladue / Ewert / Morris / Ellis profile",        "short": "SCE profile",         "type": "distortion", "ev": False},
    "19": {"name": "Collider bias",                                   "short": "Collider bias",       "type": "distortion", "ev": False},
    "20": {"name": "Dangerous offender designation",                  "short": "DO designation",      "type": "output",     "ev": False},
}


# Placeholder edge list. The real EDGES_VE comes from the Mk 8 model.py
# and should replace this when the engine is copied in.
EDGES_VE: list[tuple[str, str]] = [
    ("1", "20"),
    ("2", "20"), ("3", "20"), ("4", "20"),
    ("5", "2"),  ("5", "3"),  ("5", "4"),
    ("6", "20"), ("7", "20"),
    ("8", "9"),  ("8", "20"),
    ("9", "20"),
    ("10", "18"), ("11", "3"),
    ("12", "20"), ("13", "17"),
    ("14", "2"),  ("15", "20"),
    ("16", "20"), ("17", "2"),
    ("17", "18"), ("18", "20"),
    ("19", "20"),
]


# ── Stub network / engine ───────────────────────────────────────────────────

class _StubNetwork:
    """Minimal stand-in for `pgmpy.models.BayesianNetwork`.

    Only exposes `.nodes()`, which is what `api/v1/inference.py` uses to
    validate the evidence dict against the model. Everything else flows
    through the engine.
    """

    def __init__(self, node_ids: Iterable[str]) -> None:
        self._nodes = tuple(node_ids)

    def nodes(self) -> tuple[str, ...]:
        return self._nodes


class _StubFactor:
    """Mimics `pgmpy.factors.discrete.DiscreteFactor`. Only exposes `.values`."""

    def __init__(self, p_true: float) -> None:
        self.values = (1.0 - p_true, p_true)


class _StubInference:
    """Mimics `pgmpy.inference.VariableElimination`.

    Returns a `_StubFactor` for single-variable queries. The marginal
    P(node=1) for an unobserved node walks the evidence and applies a
    deterministic nudge per node-type; this is a fixture, not a model.
    """

    def __init__(self, network: _StubNetwork) -> None:
        self._network = network

    def query(
        self,
        variables: list[str],
        evidence: dict[str, int] | None = None,
        show_progress: bool = False,
    ) -> _StubFactor:
        evidence = evidence or {}
        if len(variables) != 1:
            # The route only ever asks for a single variable; keep it simple.
            raise NotImplementedError("Stub engine only supports single-variable queries.")
        nid = variables[0]
        return _StubFactor(_stub_marginal(nid, evidence))


def _stub_marginal(node_id: str, evidence: dict[str, int]) -> float:
    """Deterministic, type-aware placeholder marginal P(node=1)."""
    base = 0.30
    for ev_id, ev_state in evidence.items():
        if ev_state != 1:
            continue
        meta = NODE_META.get(ev_id)
        if meta is None:
            continue
        if meta["type"] == "risk":
            base += 0.09
        elif meta["type"] == "distortion":
            base += 0.05
        elif meta["type"] == "mitigation":
            base -= 0.08
        elif meta["type"] == "dual":
            base += 0.04
        elif meta["type"] == "constraint":
            base -= 0.02

    # Per-target nudge so different unobserved nodes don't all show the same value.
    own = NODE_META.get(node_id)
    if own:
        if own["type"] == "mitigation":
            base -= 0.05
        elif own["type"] == "risk":
            base += 0.05
        elif own["type"] == "distortion":
            base += 0.02

    return max(0.02, min(0.98, base))


# ── Public API ──────────────────────────────────────────────────────────────

def build_model() -> _StubNetwork:
    """Return a stand-in for the real Bayesian network."""
    return _StubNetwork(node_ids=NODE_META.keys())


def get_inference_engine(network: _StubNetwork) -> _StubInference:
    """Return a stand-in for `VariableElimination(network)`."""
    return _StubInference(network)


def compute_do_risk(
    posteriors: dict[str, float],
    collider_discount: bool = False,
) -> float:
    """Stand-in for the canonical Mk 8 post-VE DO formula.

    Weighted sum of family-tagged posteriors, logistic-squashed with a
    bias term so empty evidence lands in the Moderate band (~0.43) and
    the mockup's demo evidence pushes into Elevated (~0.60). Replace
    this entire module by copying the real `model.py` into
    `parvis_engine/`; the route layer will pick up the real function
    automatically.
    """
    score = 0.0
    for nid, p in posteriors.items():
        meta = NODE_META.get(nid)
        if meta is None:
            continue
        coef = {
            "risk":       0.10,
            "distortion": 0.06,
            "dual":       0.05,
            "mitigation": -0.08,
            "special":    -0.04,
            "constraint": -0.02,
        }.get(meta["type"], 0.0)
        score += coef * p

    if collider_discount:
        score -= 0.08  # toy version of the §5.1.19 §8 discount

    # Logistic with bias so empty evidence sits in Moderate, not High.
    import math
    return float(1.0 / (1.0 + math.exp(-(2.5 * score - 1.1))))


__all__ = [
    "NODE_META",
    "EDGES_VE",
    "build_model",
    "get_inference_engine",
    "compute_do_risk",
]
