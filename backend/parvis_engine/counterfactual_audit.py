"""
counterfactual_audit.py — PARVIS Counterfactual Audit panel

Implements the modal-counterfactual analysis described in the panel
specification document. The panel asks: "What would need to change for
a different lawful assessment to be justified?" — and surfaces twelve
doctrinally-anchored conditions that the user can toggle to test how
the inferential structure responds.

The panel is grounded in the dissertation's framing in Footnote 22 of
the Introduction: it formalises the inferential discipline that
sentencing law already demands. It does NOT advocate for any outcome.
It identifies the conditions under which the law would justify a
different conclusion.

Architecture
------------
The panel reads st.session_state.posteriors (the baseline VE output
plus profile/Gladue/SCE corrections) as input and produces a
counterfactual posterior in its own session-state slice
(st.session_state.cf_audit). It does NOT modify the baseline. Other
tabs (Inference, Report, persistent DO chip) continue to read the
baseline unchanged.

Each condition is implemented as an additive shift on one or more
node posteriors, clipped to [0.05, 0.95]. The shifted posteriors are
fed into model.compute_do_risk() to produce the counterfactual N20.

The mapping from doctrinal conditions to node manipulations follows
Chapter 5 of the dissertation. Magnitudes are per-condition calibrated
based on doctrinal weight (e.g. A1 Gladue contextual integration at
0.25 reflects the foundational nature of Gladue paragraph 64).

This module exposes one entry point: render_counterfactual_audit_tab().
The main app calls it inside `with TABS[N]:` for the new tab.

Reference: PARVIS Counterfactual Audit Panel — Conceptual Specification
(May 2026); Chapter 1 §1.3 (typology of judicial error); Chapter 3 §§3.5,
3.6, 3.7 (modeling commitments).
"""

import streamlit as st
import numpy as np
from datetime import datetime

from model import compute_do_risk

# ═════════════════════════════════════════════════════════════════════════════
# CONDITION SPECIFICATIONS
# ═════════════════════════════════════════════════════════════════════════════
#
# Each condition is specified as a dict with:
#   id           — short identifier (A1, A2, B1, ...) for UI and audit trail
#   cluster      — "A" / "B" / "C" / "D"
#   name         — short human-readable label
#   anchor       — doctrinal anchor (case + paragraph)
#   question     — the corrective question the condition surfaces
#   shifts       — dict mapping node_id → posterior shift (signed)
#                  positive shift raises the node posterior toward 1.0
#                  negative shift lowers the node posterior toward 0.0
#                  shifts are applied additively then clipped to [0.05, 0.95]
#   magnitude    — overall doctrinal weight (informational; sum of |shifts|)
#
# Direction conventions follow Chapter 5:
#   For DISTORTION nodes (N5, N6, N7, N10, N14, N17, N18, etc.) — RAISING the
#     posterior signals "more distortion present," which DOWNWEIGHTS the DO
#     risk in compute_do_risk via record_reliability or distortion correction.
#   For RISK nodes (N2, N3, N4) — LOWERING the posterior reduces the raw risk
#     contribution.
#   For MITIGATION nodes (N9 IGT/treatment) — RAISING the posterior signals
#     more mitigation present, which downweights DO risk.
#   For CONSTRAINT nodes (N1 burden of proof) — RAISING moves toward default
#     0.83 prior; lowering signals audit-derived burden compromise.
#
# All magnitudes are calibrated as posterior-shift units in [0.0, 0.30].
# Per-condition calibration reflects doctrinal weight rather than uniform
# treatment.
# ═════════════════════════════════════════════════════════════════════════════

CONDITIONS = [
    # ── Cluster A — Doctrinal Application Fidelity ───────────────────────────
    {
        "id": "A1",
        "cluster": "A",
        "name": "Gladue contextual integration at designation",
        "anchor": "Gladue [1999] 1 SCR 688 paras 64-66; Ipeelee paras 60, 73; "
                  "Natomagan 2022 ABCA 48",
        "question": "To what extent does the present assessment depend on the "
                    "assumption that Gladue was applied as a structural lens at "
                    "the designation stage rather than as a discretionary "
                    "mitigation at the disposition stage?",
        # N10 SCE misapplication: raise toward 0.85 to flag misapplication present
        # N18 SCE profile audit: raise toward 0.85 to flag SCE-integration failure
        "shifts": {10: +0.25, 18: +0.20},
        "magnitude": 0.25,
    },
    {
        "id": "A2",
        "cluster": "A",
        "name": "Morris para 97 connection without causation",
        "anchor": "Morris 2021 ONCA 680 para 97; Morris Audit (Appendix A); "
                  "Chol 2022 ABPC 41",
        "question": "To what extent does the present assessment depend on the "
                    "assumption that Morris paragraph 97 was applied as a "
                    "connection-without-causation discipline, rather than as a "
                    "stricter causation test that effectively neutralises "
                    "social context evidence?",
        # N18 SCE profile audit: raise to flag SCE-substance failure
        # N10 SCE misapplication: raise to flag misapplication
        "shifts": {18: +0.20, 10: +0.15},
        "magnitude": 0.20,
    },
    {
        "id": "A3",
        "cluster": "A",
        "name": "Ellis colonial-context evidence integration",
        "anchor": "Ellis 2022 BCCA 278; Chapter 1 §1.2 (SCE beyond Gladue)",
        "question": "To what extent does the present assessment depend on the "
                    "assumption that Ellis-style contextual reasoning was "
                    "unavailable or unintegrated, where the doctrine in fact "
                    "makes it available?",
        # N18 jurisdiction sensitivity: raise to flag jurisdictional gap
        # N10 SCE misapplication: raise to flag failure to extend beyond Gladue
        "shifts": {18: +0.15, 10: +0.10},
        "magnitude": 0.15,
    },

    # ── Cluster B — Risk Tool Validity ────────────────────────────────────────
    {
        "id": "B1",
        "cluster": "B",
        "name": "Ewert cultural validation of instrument",
        "anchor": "Ewert 2018 SCC 30 paras 47, 67; Natomagan 2022 ABCA 48",
        "question": "To what extent does the present assessment depend on the "
                    "assumption that the actuarial instrument was a "
                    "high-confidence input, where its cultural validity for "
                    "the relevant population has not been empirically "
                    "demonstrated?",
        # N5 invalid risk tools: raise toward 0.85 (Ewert flag)
        "shifts": {5: +0.20},
        "magnitude": 0.20,
    },
    {
        "id": "B2",
        "cluster": "B",
        "name": "PCL-R reliability scrutiny",
        "anchor": "Larsen et al. (2024) on PCL-R; Chapter 1 fns 46-47; "
                  "Chapter 3 §3.3",
        "question": "To what extent does the present assessment depend on the "
                    "PCL-R as a reliable indicator of psychopathy, where its "
                    "reliability for the relevant population and assessor has "
                    "not been independently validated?",
        # N3 sexual offence profile: lower toward 0.30 (since N3 consolidates
        # PCL-R and Static-99R per CH5 taxonomy)
        # N5 risk tools: raise modestly to flag instrument concern
        "shifts": {3: -0.10, 5: +0.10},
        "magnitude": 0.10,
    },
    {
        "id": "B3",
        "cluster": "B",
        "name": "Cross-validation against Indigenous norm group",
        "anchor": "Ewert para 67; Lee, Hanson & Blais (2020); Chapter 1 fn 49",
        "question": "To what extent does the present assessment depend on the "
                    "assumption that the actuarial instrument was "
                    "cross-validated against the relevant norm group, where "
                    "the published validation studies suggest otherwise?",
        # N5 invalid risk tools: raise to flag validation gap
        # N9 IGT/treatment: raise to flag mitigation context
        "shifts": {5: +0.15, 9: +0.10},
        "magnitude": 0.15,
    },

    # ── Cluster C — Record Integrity ──────────────────────────────────────────
    {
        "id": "C1",
        "cluster": "C",
        "name": "Temporal distortion in the criminal record",
        "anchor": "Chapter 3 §3.5; Friesen 2020 SCC 9; §3.5.5 modeling commitment",
        "question": "To what extent does the present assessment depend on prior "
                    "convictions whose evidentiary weight reflects sentencing "
                    "norms that have since been repudiated or substantially "
                    "revised?",
        # N14 temporal distortion: raise toward 0.85 (engages burnout multiplier
        # in compute_do_risk and reduces record_reliability)
        "shifts": {14: +0.20},
        "magnitude": 0.15,
    },
    {
        "id": "C2",
        "cluster": "C",
        "name": "Disproportionate policing as record-inflation",
        "anchor": "Chapter 3 §3.6; §3.6.5 modeling commitment",
        "question": "To what extent does the present assessment depend on a "
                    "criminal record whose evidentiary weight reflects "
                    "heightened enforcement and surveillance rather than "
                    "culpable conduct?",
        # N17 over-policing: raise toward 0.85 (reduces record_reliability)
        # N13 TraceRoute: raise to flag structural systemic bias
        "shifts": {17: +0.25, 13: +0.10},
        "magnitude": 0.20,
    },
    {
        "id": "C3",
        "cluster": "C",
        "name": "Plea-pressure under structural disadvantage",
        "anchor": "Chapter 3 §§3.4.1-3.4.5 (FASD, IAC, structural mistrust, WCGPs)",
        "question": "To what extent does the present assessment depend on prior "
                    "guilty pleas whose reliability is compromised by "
                    "structural pressures that the doctrine recognises as "
                    "material to the inference?",
        # N6 IAC: raise to flag counsel inadequacy
        # N7 bail-WCGP cascade: raise toward 0.85 (strongest record-reliability
        # signal per §RM.5 with weight 0.35 in compute_do_risk)
        # N8 FASD: raise to flag dual-factor cognitive impairment
        "shifts": {6: +0.15, 7: +0.20, 8: +0.10},
        "magnitude": 0.15,
    },

    # ── Cluster D — Procedural Sequencing ─────────────────────────────────────
    {
        "id": "D1",
        "cluster": "D",
        "name": "Sequencing of statutory aggravation and Gladue",
        "anchor": "Chapter 1 §1.3 (sequencing error and penal inflation); "
                  "s. 718.201; National Inquiry MMIWG (2019)",
        "question": "To what extent does the present assessment depend on a "
                    "sequencing in which Gladue analysis followed rather than "
                    "preceded the determination of offence seriousness and "
                    "statutory aggravation?",
        # N10 SCE misapplication: raise to flag sequencing failure
        # N16 doctrinal tension (s.718.04 vs s.718.2(e)): raise to flag
        # statutory tension surfacing
        "shifts": {10: +0.15, 16: +0.20},
        "magnitude": 0.20,
    },
    {
        "id": "D2",
        "cluster": "D",
        "name": "Burden allocation under judicial-notice",
        "anchor": "Gladue paras 80, 83; Ipeelee para 60; Chapter 1 para 149",
        "question": "To what extent does the present assessment depend on a "
                    "burden allocation that effectively required the offender "
                    "to prove the relevance of systemic factors that judicial "
                    "notice presumes?",
        # N1 burden of proof: lower toward 0.65 from default 0.83 to signal
        # audit-derived burden compromise (impermissible burden-shifting
        # detected — N1 reflects "burden in the right place" doctrinally;
        # lowering N1 propagates structurally through VE to N2/N3/N4/N6/N8)
        "shifts": {1: -0.15},
        "magnitude": 0.15,
    },
    {
        "id": "D3",
        "cluster": "D",
        "name": "Treatability under structural availability",
        "anchor": "Natomagan 2022 ABCA 48; Chapter 2 §2.8.6; Chapter 3 §3.9.3",
        "question": "To what extent does the present assessment depend on the "
                    "assumption that the offender's failure to engage in "
                    "treatment reflects individual intractability rather than "
                    "structural unavailability of culturally appropriate "
                    "programming?",
        # N9 IGT/treatment: raise toward 0.85 to signal mitigation context
        # established (not absence)
        "shifts": {9: +0.15},
        "magnitude": 0.15,
    },
]

# Lookup by id
CONDITIONS_BY_ID = {c["id"]: c for c in CONDITIONS}

CLUSTER_LABELS = {
    "A": "Cluster A — Doctrinal Application Fidelity",
    "B": "Cluster B — Risk Tool Validity",
    "C": "Cluster C — Record Integrity",
    "D": "Cluster D — Procedural Sequencing",
}

CLUSTER_COLORS = {
    "A": "#3B6D11",   # green — Tetrad core
    "B": "#534AB7",   # purple — Ewert validity
    "C": "#A32D2D",   # dark red — record integrity
    "D": "#BA7517",   # bronze — sequencing
}


# ═════════════════════════════════════════════════════════════════════════════
# COMPUTATION
# ═════════════════════════════════════════════════════════════════════════════

def apply_conditions(baseline_posteriors: dict, active_ids: list) -> dict:
    """
    Apply the shifts implied by `active_ids` to a copy of `baseline_posteriors`
    and return the counterfactual posterior dict (including counterfactual N20).

    The baseline dict is NOT modified. Shifts are additive then clipped to
    [0.05, 0.95]. Multiple conditions touching the same node accumulate.

    Parameters
    ----------
    baseline_posteriors : dict
        The current st.session_state.posteriors — node ID → posterior prob.
    active_ids : list[str]
        List of condition IDs ("A1", "B2", ...) the user has activated.

    Returns
    -------
    dict
        Counterfactual posterior dict with the same keys as baseline and an
        updated [20] computed via model.compute_do_risk().
    """
    cf = dict(baseline_posteriors)
    accumulated = {}  # node_id → total shift

    for cid in active_ids:
        cond = CONDITIONS_BY_ID.get(cid)
        if cond is None:
            continue
        for nid, shift in cond["shifts"].items():
            accumulated[nid] = accumulated.get(nid, 0.0) + shift

    for nid, shift in accumulated.items():
        baseline_val = float(cf.get(nid, 0.5))
        cf[nid] = float(np.clip(baseline_val + shift, 0.05, 0.95))

    # Recompute N20 with the modified posteriors
    cf[20] = compute_do_risk(cf)
    return cf


def compute_top_drivers(posteriors: dict, k: int = 3) -> list:
    """
    Identify the top-k nodes whose posteriors are doing the most inferential
    work toward the current N20 risk. Uses the relevant compute_do_risk
    weights as a sensitivity proxy.

    Returns list of (node_id, contribution_score) tuples, descending.
    """
    # Approximate contribution = weight × posterior, using the dst weights
    # from compute_do_risk plus the raw-risk node weights. Higher score
    # means the node is contributing more to the final risk.
    DRIVER_WEIGHTS = {
        2: 0.30,    # N2 validated risk elevators (raw)
        3: 0.25,    # N3 sexual offence profile (raw)
        4: 0.20,    # N4 dynamic risk (raw)
        5: 0.18,    # N5 invalid risk tools (dst)
        6: 0.12,    # N6 IAC (dst)
        7: 0.08,    # N7 bail-WCGP (dst, but weight=0.35 in record_reliability)
        9: 0.05,    # N9 IGT/treatment (dst — mitigation)
        10: 0.25,   # N10 SCE misapplication (dst)
        12: 0.05,   # N12 judging-the-judge (dst)
        13: 0.19,   # N13 TraceRoute (dst)
        14: 0.20,   # N14 temporal (record_reliability)
        15: 0.04,   # N15 tariff distortion (dst)
        16: 0.04,   # N16 doctrinal tension (dst)
        17: 0.30,   # N17 over-policing (record_reliability)
        18: 0.15,   # N18 SCE profile audit (record_reliability)
    }
    scored = []
    for nid, w in DRIVER_WEIGHTS.items():
        post = float(posteriors.get(nid, 0.5))
        # Center on 0.5 so that values far from neutral (in either direction)
        # show as high inferential pressure. This surfaces nodes that are
        # actively driving the assessment, whether toward or away from DO risk.
        scored.append((nid, w * abs(post - 0.5) * 2))
    scored.sort(key=lambda x: -x[1])
    return scored[:k]


def layer_of_greatest_pressure(posteriors: dict) -> str:
    """
    Identify which layer (I, II, or III) carries the greatest inferential
    pressure on the current assessment. Used for the "Layer of greatest
    inferential pressure" readout.
    """
    LAYER_I = [2, 3, 4]                    # Substantive risk
    LAYER_II = [5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19]  # Distortion
    # N1 conditions, N20 is output

    layer_i_pressure = sum(
        abs(float(posteriors.get(nid, 0.5)) - 0.5) for nid in LAYER_I
    )
    layer_ii_pressure = sum(
        abs(float(posteriors.get(nid, 0.5)) - 0.5) for nid in LAYER_II
    )

    if layer_i_pressure > layer_ii_pressure:
        return "Layer I — Substantive Risk"
    elif layer_ii_pressure > layer_i_pressure * 1.05:
        return "Layer II — Systemic Distortions"
    else:
        return "Layer I and II — Balanced"


# ═════════════════════════════════════════════════════════════════════════════
# RISK BAND HELPER (mirrors app.py rb() function)
# ═════════════════════════════════════════════════════════════════════════════

def _risk_band(p: float) -> tuple:
    """Return (label, fg_color, bg_color) for a DO risk probability."""
    if p >= 0.70:
        return ("HIGH", "#FFFFFF", "#A32D2D")
    elif p >= 0.50:
        return ("ELEVATED", "#FFFFFF", "#BA7517")
    elif p >= 0.30:
        return ("MODERATE", "#1A1A1A", "#E0C56A")
    else:
        return ("LOW", "#FFFFFF", "#3B6D11")


# ═════════════════════════════════════════════════════════════════════════════
# UI RENDERING
# ═════════════════════════════════════════════════════════════════════════════

def _init_session_state():
    """Initialise the panel's session-state slice if not present."""
    if "cf_audit" not in st.session_state:
        st.session_state.cf_audit = {
            "active_conditions": [],
            "trail": [],
            "last_baseline_n20": None,
        }


def _record_trail_entry(active_before: list, active_after: list,
                         baseline_n20: float, cf_n20: float):
    """Append an entry to the audit trail describing what changed."""
    trail = st.session_state.cf_audit["trail"]
    timestamp = datetime.now().strftime("%H:%M:%S")

    # First entry: baseline
    if not trail:
        trail.append({
            "ts": timestamp,
            "kind": "baseline",
            "delta": None,
            "n20": baseline_n20,
            "active": [],
        })

    # Identify what changed between active_before and active_after
    added = [c for c in active_after if c not in active_before]
    removed = [c for c in active_before if c not in active_after]

    delta = cf_n20 - baseline_n20

    for cid in added:
        trail.append({
            "ts": timestamp,
            "kind": "add",
            "cid": cid,
            "delta": delta,
            "n20": cf_n20,
            "active": list(active_after),
        })
    for cid in removed:
        trail.append({
            "ts": timestamp,
            "kind": "remove",
            "cid": cid,
            "delta": delta,
            "n20": cf_n20,
            "active": list(active_after),
        })


def render_counterfactual_audit_tab():
    """
    Main entry point. Renders the Counterfactual Audit tab content.
    Called from app.py inside `with TABS[N]:` for the new tab index.
    """
    _init_session_state()

    # Read baseline posteriors. If inference hasn't run yet, surface a notice.
    baseline = st.session_state.get("posteriors", {})
    if not baseline or 20 not in baseline:
        st.info(
            "▶ Run the inference first (📊 Inference tab) to compute the "
            "baseline assessment that this audit examines."
        )
        return

    baseline_n20 = float(baseline[20])
    cf_state = st.session_state.cf_audit
    active = list(cf_state["active_conditions"])

    # ── Header ──────────────────────────────────────────────────────────────
    st.markdown(
        """
        <div style="border-left:4px solid #534AB7; padding:12px 16px;
                    background:#F4F2FB; border-radius:4px; margin-bottom:14px;">
          <div style="font-family:'Cormorant Garamond',serif; font-size:1.4rem;
                      font-weight:700; color:#1A1A1A; margin-bottom:8px;">
            Counterfactual Audit
          </div>
          <div style="font-size:0.92rem; line-height:1.55; color:#3A3A3A;">
            This panel examines how the current Bayesian assessment depends
            on its operative assumptions. It identifies which assumptions are
            doing the most inferential work and surfaces the conditions under
            which a different lawful assessment would be doctrinally available.
          </div>
          <div style="font-size:0.92rem; line-height:1.55; color:#3A3A3A;
                      margin-top:8px; font-style:italic;">
            The system does not recommend an alternative outcome. It identifies
            the conditions under which the law would justify a different
            conclusion.
          </div>
          <div style="font-size:0.88rem; line-height:1.5; color:#555;
                      margin-top:8px;">
            Use this panel to test the robustness of the current assessment,
            identify load-bearing assumptions, and articulate revision
            conditions in the language of the Tetrad — Gladue, Morris, Ellis,
            and Ewert — and the structural distortions the law obliges courts
            to recognise.
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Methodology expander ────────────────────────────────────────────────
    with st.expander("Methodology", expanded=False):
        st.markdown(
            """
The Counterfactual Audit identifies revision conditions in two stages.

**Stage 1 — Doctrinal anchoring.** Each condition is anchored in a binding or
strongly directive appellate authority (*Gladue*, *Morris*, *Ellis*, *Ewert*)
or in a structural distortion documented in Chapter 3 of the dissertation.
The Tetrad supplies the conditions; the panel does not invent them.

**Stage 2 — Bayesian implementation.** Each condition is implemented as an
additive shift on one or more node posteriors in the existing 20-node DAG,
clipped to [0.05, 0.95]. The shifted posteriors are fed into the calibrated
`compute_do_risk()` formula (Chapter 5 §5.1.20) which combines record-
reliability multipliers (N6, N7, N14, N17, N18), Ewert tool validity (N5),
distortion correction, and age-burnout to produce the counterfactual
designation risk.

The panel does not predict the outcome of any specific case. It produces
what the inferential structure would yield if the doctrinal conditions were
established on the evidence. The legal evaluation of whether those
conditions are in fact established belongs to the sentencing court.

**Magnitude calibration.** Each condition has a per-condition magnitude
based on doctrinal weight. Foundational Tetrad obligations (e.g. A1 Gladue
contextual integration at 0.25) carry larger shifts than narrower
instrument-specific concerns (e.g. B2 PCL-R reliability at 0.10).
            """
        )

    # ── Current Assessment Summary ──────────────────────────────────────────
    bl_label, bl_fg, bl_bg = _risk_band(baseline_n20)
    top_drivers = compute_top_drivers(baseline, k=3)
    layer = layer_of_greatest_pressure(baseline)

    # Node label lookup from model
    from model import NODE_META
    def _node_label(nid):
        meta = NODE_META.get(nid, {})
        return meta.get("short", f"N{nid}")

    drivers_html = "".join([
        f"<div style='padding:2px 0; font-size:0.88rem; color:#3A3A3A;'>"
        f"&nbsp;&nbsp;• <b>N{nid}</b> {_node_label(nid)} "
        f"<span style='color:#888'>(posterior {baseline.get(nid, 0.5)*100:.0f}%)</span>"
        f"</div>"
        for nid, _score in top_drivers
    ])

    st.markdown(
        f"""
        <div style="border:1px solid #DDD; border-radius:6px; padding:14px 18px;
                    background:#FBFBFB; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="font-size:0.85rem; color:#666; font-weight:600;">
              Current Assessment
            </div>
            <div style="background:{bl_bg}; color:{bl_fg}; padding:3px 10px;
                        border-radius:3px; font-weight:700; font-size:0.85rem;">
              {bl_label}
            </div>
            <div style="font-size:1.4rem; font-weight:700; color:#1A1A1A;">
              {baseline_n20*100:.1f}%
            </div>
            <div style="color:#666; font-size:0.82rem;">P(N20 = High)</div>
          </div>
          <div style="margin-top:10px; font-size:0.85rem; font-weight:600;
                      color:#555;">
            Most influential drivers (descending sensitivity):
          </div>
          {drivers_html}
          <div style="margin-top:10px; font-size:0.85rem; font-weight:600;
                      color:#555;">
            Layer of greatest inferential pressure:
            <span style="font-weight:500; color:#534AB7;">{layer}</span>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # ── Revision Conditions ─────────────────────────────────────────────────
    st.markdown(
        "<div style='font-family:\"Cormorant Garamond\",serif; "
        "font-size:1.15rem; font-weight:700; color:#1A1A1A; "
        "margin:18px 0 8px 0;'>Revision Conditions</div>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<div style='font-size:0.86rem; color:#555; margin-bottom:14px;'>"
        "Each toggle represents a doctrinally available revision question. "
        "Expand a condition to see the doctrinal anchor and the corrective "
        "question it surfaces.</div>",
        unsafe_allow_html=True,
    )

    # Two-column layout: conditions on the left, revised assessment on the right
    col_conditions, col_revised = st.columns([1.4, 1.0])

    with col_conditions:
        # Render conditions grouped by cluster
        for cluster_letter in ["A", "B", "C", "D"]:
            cluster_conds = [c for c in CONDITIONS if c["cluster"] == cluster_letter]
            color = CLUSTER_COLORS[cluster_letter]
            label = CLUSTER_LABELS[cluster_letter]

            st.markdown(
                f"<div style='border-left:3px solid {color}; padding:6px 0 6px 10px; "
                f"margin:14px 0 6px 0; font-size:0.92rem; font-weight:600; "
                f"color:{color};'>{label}</div>",
                unsafe_allow_html=True,
            )

            for cond in cluster_conds:
                cid = cond["id"]
                # Checkbox; key = "cf_cond_<id>" so state persists
                checked = st.checkbox(
                    f"**{cid}** — {cond['name']}",
                    value=(cid in active),
                    key=f"cf_cond_{cid}",
                    help=cond["anchor"],
                )
                if checked and cid not in active:
                    active.append(cid)
                elif not checked and cid in active:
                    active.remove(cid)

                # Show anchor + question in small text below
                st.markdown(
                    f"<div style='margin:-6px 0 8px 26px; font-size:0.78rem; "
                    f"color:#777; line-height:1.4;'>"
                    f"<i>Anchor:</i> {cond['anchor']}<br>"
                    f"<i>Question:</i> {cond['question']}"
                    f"</div>",
                    unsafe_allow_html=True,
                )

        # Convenience buttons
        st.markdown("<div style='margin-top:14px;'></div>", unsafe_allow_html=True)
        bcol1, bcol2, bcol3 = st.columns(3)
        with bcol1:
            if st.button("Reset to baseline", key="cf_reset"):
                # Clear all condition checkboxes
                for cond in CONDITIONS:
                    st.session_state[f"cf_cond_{cond['id']}"] = False
                st.session_state.cf_audit["active_conditions"] = []
                st.rerun()
        with bcol2:
            if st.button("Select all", key="cf_all"):
                for cond in CONDITIONS:
                    st.session_state[f"cf_cond_{cond['id']}"] = True
                st.session_state.cf_audit["active_conditions"] = [
                    c["id"] for c in CONDITIONS
                ]
                st.rerun()
        with bcol3:
            if st.button("Clear trail", key="cf_clear_trail"):
                st.session_state.cf_audit["trail"] = []
                st.rerun()

    # ── Compute counterfactual ──────────────────────────────────────────────
    cf_post = apply_conditions(baseline, active)
    cf_n20 = float(cf_post[20])
    cf_label, cf_fg, cf_bg = _risk_band(cf_n20)
    delta = cf_n20 - baseline_n20

    # Update audit trail when active set changes
    prev_active = list(cf_state["active_conditions"])
    if prev_active != active:
        _record_trail_entry(prev_active, active, baseline_n20, cf_n20)
        st.session_state.cf_audit["active_conditions"] = list(active)
        st.session_state.cf_audit["last_baseline_n20"] = baseline_n20

    # ── Revised Assessment Readout ──────────────────────────────────────────
    with col_revised:
        delta_color = "#3B6D11" if delta < 0 else ("#A32D2D" if delta > 0 else "#888")
        delta_sign = "−" if delta < 0 else ("+" if delta > 0 else "±")

        active_html = "".join([
            f"<div style='padding:2px 0; font-size:0.84rem;'>"
            f"&nbsp;&nbsp;• <b>{cid}</b> {CONDITIONS_BY_ID[cid]['name']}"
            f"</div>"
            for cid in active
        ]) if active else (
            "<div style='font-size:0.85rem; color:#888; font-style:italic;'>"
            "No conditions active. Toggle conditions to see how the "
            "inferential structure responds.</div>"
        )

        revised_layer = layer_of_greatest_pressure(cf_post)

        st.markdown(
            f"""
            <div style="border:1px solid #DDD; border-radius:6px; padding:14px 18px;
                        background:#F8F8FB; position:sticky; top:10px;">
              <div style="font-size:0.85rem; color:#666; font-weight:600;
                          margin-bottom:8px;">
                Revised Assessment
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="background:{cf_bg}; color:{cf_fg}; padding:3px 10px;
                            border-radius:3px; font-weight:700; font-size:0.82rem;">
                  {cf_label}
                </div>
                <div style="font-size:1.6rem; font-weight:700; color:#1A1A1A;">
                  {cf_n20*100:.1f}%
                </div>
              </div>
              <div style="margin-top:6px; font-size:0.85rem;
                          color:{delta_color}; font-weight:600;">
                Change from baseline: {delta_sign}{abs(delta)*100:.1f} pp
              </div>
              <div style="margin-top:12px; font-size:0.82rem; font-weight:600;
                          color:#555;">
                Conditions active:
              </div>
              {active_html}
              <div style="margin-top:10px; font-size:0.82rem; color:#666;">
                <i>Layer of greatest revised pressure:</i><br>
                <span style="color:#534AB7; font-weight:600;">{revised_layer}</span>
              </div>
              <div style="margin-top:14px; padding:10px; background:#FFF;
                          border-left:3px solid #BA7517; font-size:0.78rem;
                          color:#444; line-height:1.5;">
                <b>Doctrinal note.</b> The revised assessment reflects what
                the inferential structure would produce if these doctrinal
                conditions were established on the evidence. It does not
                predict the outcome of the case. It identifies the conditions
                under which a different lawful assessment would be doctrinally
                available.
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    # ── Audit Trail ─────────────────────────────────────────────────────────
    st.markdown("<div style='margin-top:24px;'></div>", unsafe_allow_html=True)
    st.markdown(
        "<div style='font-family:\"Cormorant Garamond\",serif; "
        "font-size:1.15rem; font-weight:700; color:#1A1A1A; "
        "margin-bottom:8px;'>Audit Trail</div>",
        unsafe_allow_html=True,
    )

    trail = st.session_state.cf_audit["trail"]
    if not trail:
        st.markdown(
            "<div style='font-size:0.85rem; color:#888; font-style:italic; "
            "padding:8px 0;'>No conditions tested in this session yet. Toggle "
            "a condition above to begin the audit trail.</div>",
            unsafe_allow_html=True,
        )
    else:
        trail_rows = []
        for entry in trail:
            ts = entry["ts"]
            if entry["kind"] == "baseline":
                trail_rows.append(
                    f"<tr><td style='padding:4px 8px; font-family:monospace; "
                    f"color:#666;'>{ts}</td>"
                    f"<td style='padding:4px 8px; color:#666;'>baseline</td>"
                    f"<td style='padding:4px 8px;'>—</td>"
                    f"<td style='padding:4px 8px; font-weight:600;'>"
                    f"{entry['n20']*100:.1f}%</td>"
                    f"<td style='padding:4px 8px;'>—</td></tr>"
                )
            else:
                cid = entry.get("cid", "")
                name = CONDITIONS_BY_ID.get(cid, {}).get("name", cid)
                kind_symbol = "+" if entry["kind"] == "add" else "−"
                kind_color = "#3B6D11" if entry["kind"] == "add" else "#A32D2D"
                d = entry.get("delta", 0)
                d_sign = "−" if d < 0 else ("+" if d > 0 else "±")
                d_color = "#3B6D11" if d < 0 else ("#A32D2D" if d > 0 else "#888")
                trail_rows.append(
                    f"<tr><td style='padding:4px 8px; font-family:monospace; "
                    f"color:#666;'>{ts}</td>"
                    f"<td style='padding:4px 8px; color:{kind_color}; "
                    f"font-weight:700;'>{kind_symbol} {cid}</td>"
                    f"<td style='padding:4px 8px; font-size:0.85rem;'>{name}</td>"
                    f"<td style='padding:4px 8px; font-weight:600;'>"
                    f"{entry['n20']*100:.1f}%</td>"
                    f"<td style='padding:4px 8px; color:{d_color}; "
                    f"font-weight:600;'>{d_sign}{abs(d)*100:.1f} pp</td></tr>"
                )

        st.markdown(
            f"""
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;
                          border:1px solid #DDD; border-radius:4px; overflow:hidden;">
              <thead>
                <tr style="background:#F0F0F5; color:#444; font-weight:600;
                           font-size:0.78rem; text-align:left;">
                  <th style="padding:6px 8px;">Time</th>
                  <th style="padding:6px 8px;">Action</th>
                  <th style="padding:6px 8px;">Condition</th>
                  <th style="padding:6px 8px;">N20</th>
                  <th style="padding:6px 8px;">Δ</th>
                </tr>
              </thead>
              <tbody>{"".join(trail_rows)}</tbody>
            </table>
            """,
            unsafe_allow_html=True,
        )

    # Export-to-report stub (full integration belongs in audit_export.py later)
    st.markdown("<div style='margin-top:14px;'></div>", unsafe_allow_html=True)
    if st.button("Mark trail for inclusion in Audit Report", key="cf_mark_export"):
        st.session_state.cf_audit["mark_for_export"] = True
        st.success(
            "Counterfactual trail marked. The Audit Report tab will include "
            "this trail as Appendix CF when the report is generated."
        )
