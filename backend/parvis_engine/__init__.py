"""
parvis_engine — Mark 8 engine, exposed verbatim to the Mark 9 backend.

This __init__.py is the ONLY adaptation layer between Mk 8 and Mk 9. The
nine Python files in this package are copied verbatim from Mk 8 and never
modified — that engine is the substantive contribution of the thesis. If
the Mk 9 API layer needs a different shape, the transformation lives here
or in api/v1/, never in the engine modules.

What this shim does:
  1. Registers each Mk 8 module under its bare name in sys.modules so that
     intra-Mk-8 imports like `from model import query_do_risk` resolve
     correctly. Mk 8 was a flat folder; Mk 9 nests these inside a package.
  2. Re-exports a string-keyed NODE_META (Mk 8 keys are int, Mk 9 expects str).
  3. Re-exports a string-keyed EDGES_VE for the same reason.
  4. Re-exports compute_do_risk so it accepts the Mk 9 route's optional
     collider_discount kwarg, defaulting to False (Mk 8 has no such param).
  5. Re-exports build_model, get_inference_engine, query_do_risk verbatim.

Modules NOT loaded at boot (only on demand by Phase B+ routes):
    doctrine, quantum_diagnostics, bloch_sphere, audit_export,
    document_analyzer, stare_decisis, canlii_client, counterfactual_audit
"""

import sys
from importlib import import_module


# ── Bare-name module aliases ─────────────────────────────────────────────────
# Mk 8 files freely do `from model import ...`, `from doctrine import ...`,
# etc. — that worked when everything lived in a flat folder. Now that the
# engine is a package, those bare imports would fail. We pre-register each
# Mk 8 module under both its qualified and bare name so the engine code
# runs unchanged.
#
# Modules are listed in load order: any module that is imported at module-
# evaluation time by another (model is imported by quantum_diagnostics, etc.)
# must come first. Lazy modules (canlii_client imports streamlit) are NOT
# pre-imported here — they're loaded on demand when a route reaches them.

_MK8_MODULES = [
    "model",
    "doctrine",
    "bloch_sphere",
    "quantum_diagnostics",
    "audit_export",
    "document_analyzer",
    "stare_decisis",
    "counterfactual_audit",
    # canlii_client deliberately omitted — has Streamlit dependency, lazy-load.
]

for _name in _MK8_MODULES:
    try:
        _mod = import_module(f"parvis_engine.{_name}")
        sys.modules[_name] = _mod
    except ImportError:
        # If an optional module fails to import (e.g. Streamlit-dependent),
        # just skip it — routes that need it will surface the real error.
        pass


# ── Re-exports from model ────────────────────────────────────────────────────

from .model import (
    build_model,
    get_inference_engine,
    query_do_risk,
)
from .model import compute_do_risk as _compute_do_risk_mk8
from .model import NODE_META as _NODE_META_INT
from .model import EDGES_VE as _EDGES_VE_INT


# ── Shim 1: string-keyed NODE_META ────────────────────────────────────────────

NODE_META: dict[str, dict] = {
    str(nid): meta for nid, meta in _NODE_META_INT.items()
}


# ── Shim 2: string-keyed EDGES_VE ─────────────────────────────────────────────

EDGES_VE: list[tuple[str, str]] = [
    (str(a), str(b)) for a, b in _EDGES_VE_INT
]


# ── Shim 3: compute_do_risk with optional collider_discount ───────────────────

def compute_do_risk(posteriors: dict, collider_discount: bool = False) -> float:
    normalised = {int(k) if str(k).isdigit() else k: v for k, v in posteriors.items()}
    return _compute_do_risk_mk8(normalised)


__all__ = [
    "build_model",
    "get_inference_engine",
    "query_do_risk",
    "compute_do_risk",
    "NODE_META",
    "EDGES_VE",
]