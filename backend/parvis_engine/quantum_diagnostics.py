"""
PARVIS — Quantum Bayesianism Diagnostic Module
Appendix Q: The Limits of Classical Bayesian Inference in Legally Distorted Systems

This module implements the QBism diagnostic layer described in Appendix Q.
It does NOT replace classical Bayesian inference (Variable Elimination).
It flags epistemic conditions under which classical probabilistic outputs
may require heightened scrutiny.

Per Appendix Q: "Quantum Bayesianism provides a principled vocabulary for
identifying those pressure points... its function is diagnostic."

Four diagnostic checks:
  1. Prior contamination — inherited distorted priors
  2. Order effects (non-commutativity) — evidentiary sequence matters
  3. Contextual interference — same evidence, different meaning per framework
  4. Premature scalar collapse — belief hardened before all SCE reviewed

References: Busemeyer & Bruza (2012), Wojciechowski (2023), Kochen & Specker (1967)
"""

import numpy as np
from typing import Dict, List, Tuple, Optional


# ── Density matrix ────────────────────────────────────────────────────────────
def compute_density_matrix(p_high: float) -> np.ndarray:
    """
    Compute the 2x2 density matrix ρ for the belief state.

    For a pure state |ψ⟩ = α|DO⟩ + β|¬DO⟩ where |α|² = p_high:
        ρ = |ψ⟩⟨ψ| = [[p_high,        sqrt(p_high*(1-p_high))],
                       [sqrt(p_high*(1-p_high)), 1-p_high       ]]

    The off-diagonal terms (coherences) encode superposition.
    A diagonal ρ (coherences → 0) represents a classically resolved belief state.
    Maximum coherence at p_high = 0.5 (equator of Bloch sphere).

    For a mixed state representing genuine judicial uncertainty, ρ is still
    positive semi-definite and Hermitian, with Tr(ρ) = 1.

    Reference: Busemeyer & Bruza (2012) §2.3; Nielsen & Chuang (2000) §2.4
    """
    alpha_sq = float(np.clip(p_high, 0.0, 1.0))
    beta_sq  = 1.0 - alpha_sq
    coherence = float(np.sqrt(alpha_sq * beta_sq))   # off-diagonal term
    rho = np.array([
        [alpha_sq,  coherence],
        [coherence, beta_sq  ]
    ])
    return rho


def density_matrix_summary(p_high: float) -> Dict:
    """Return density matrix with interpretive metadata."""
    rho = compute_density_matrix(p_high)
    coherence = rho[0, 1]
    purity = float(np.trace(rho @ rho))  # Tr(ρ²) — 1.0 = pure state, 0.5 = maximally mixed
    return {
        "rho": rho.tolist(),
        "coherence": round(coherence, 4),
        "purity": round(purity, 4),
        "interpretation": (
            "Pure state — belief fully coherent (maximum superposition)" if purity > 0.95
            else "Near-pure state — high epistemic coherence" if purity > 0.75
            else "Mixed state — partial decoherence, belief partially resolved" if purity > 0.55
            else "Highly mixed state — belief approaching classical resolution"
        ),
    }


# ── Plain language NLP generator ──────────────────────────────────────────────
def build_plain_language_prompt(diags: Dict, posteriors: Dict) -> str:
    """
    Build the system + user prompt for the plain language NLP layer.
    Returns a formatted string ready to send to the Claude API.
    """
    do_p     = posteriors.get(20, 0.5)
    si       = diags.get("superposition_index", 0.5)
    ov_flag  = diags.get("overall_flag", "none")
    summary  = diags.get("summary", "")

    pc   = diags.get("prior_contamination", {})
    oe   = diags.get("order_effects", {})
    ci   = diags.get("contextual_interference", {})
    bs   = diags.get("belief_stasis", {})

    dm   = density_matrix_summary(do_p)

    prompt = f"""You are a plain-language translator for PARVIS — a Bayesian sentencing tool used
in Canadian Dangerous Offender proceedings. Your task is to translate a technical
QBism (Quantum Bayesianism) diagnostic report into clear, accessible language for
a judge, Crown counsel, or defence barrister who has no background in probability
theory or quantum mechanics.

RULES:
- Never use the words "quantum", "superposition", "Bloch sphere", "density matrix",
  "eigenvalue", "Hilbert space", or any physics jargon.
- Do not say "the model" or "the algorithm" — say "the analysis" or "PARVIS".
- Write in plain, direct English. Short paragraphs. No bullet point walls.
- Each diagnostic section should be 2-4 sentences maximum.
- Do not hedge excessively. Be direct about what the findings mean.
- End with a single "Bottom line" paragraph of 2-3 sentences.
- Tone: a senior barrister explaining a technical issue to a judge in clear terms.

DIAGNOSTIC DATA:
Overall flag:         {ov_flag.upper()}
DO designation risk:  {do_p*100:.1f}%
Ambiguity index:      {si:.2f} / 1.0  ({
    "High — competing conclusions remain genuinely open" if si > 0.6
    else "Moderate ambiguity" if si > 0.35
    else "Low — analysis has largely resolved toward one conclusion"
})
Belief coherence:     {dm['purity']:.2f} / 1.0  ({dm['interpretation']})

PRIOR CONTAMINATION — {pc.get('severity','none').upper()} — Flagged: {pc.get('flagged', False)}
Items: {pc.get('items', [])}

ORDER EFFECTS — {oe.get('severity','none').upper()} — Flagged: {oe.get('flagged', False)}
Items: {oe.get('items', [])}

CONTEXTUAL INTERFERENCE — {ci.get('severity','none').upper()} — Flagged: {ci.get('flagged', False)}
Items: {ci.get('items', [])}

BELIEF STASIS — {bs.get('severity','none').upper()} — Flagged: {bs.get('flagged', False)}
Items: {bs.get('items', [])}

IMPORTANT FRAMING: The numerical output ({do_p*100:.1f}%) is mathematically valid.
These diagnostics do not change that number. They identify whether the reasoning
process that produced it is epistemically trustworthy — or whether structural
features of the legal system may have shaped it in ways that warrant closer
scrutiny before it informs a judicial decision.

Now write the plain language report. Use the following section headings exactly:
## What the analysis found
## Reliability of the risk reading
## Prior contamination
## Sequencing of evidence
## Contextual sensitivity
## Belief stasis
## Bottom line
"""
    return prompt


# ── Diagnostic thresholds ─────────────────────────────────────────────────────
PRIOR_CONTAMINATION_THRESHOLD = 0.65  # Nodes above this are suspect if no evidence entered
ORDER_EFFECT_DELTA = 0.08             # Meaningful shift in posterior from reordering (existing check)
BELIEF_STASIS_THRESHOLD = 0.05        # SCE entered but posterior shifts < this → belief stasis
COLLAPSE_RISK_NODES = {5, 12, 17}     # Nodes whose High state signals actuarial hardening

# ── Extension thresholds (research-prototype values — illustrative anchors) ───
# These thresholds are illustrative for the Appendix Q diagnostic framework.
# They are not defended scholarship; they would require expert elicitation
# through the SHELF/Cooke methodology described in Appendix O §O.3 before
# operational deployment. See module docstring for the diagnostic-not-decision
# scope per Appendix Q §AQ.4.
ORDER_STABILITY_DELTA = 0.05          # Max ΔN20 across permutations above which
                                      # a sequence is considered order-unstable
CONTEXTUALITY_GATE_DELTA = 0.05       # Max ΔN20 across connection-gate strengths
                                      # (Morris para 97) above which the case is
                                      # contextually sensitive to that doctrinal call

# Connection-gate weight schedule used by the contextuality check.
# Mirrors app.py:cmult() — kept in sync deliberately (see Appendix Q §AQ.3.3.5.4).
_CONN_GATE_WEIGHTS = {
    "none":     0.00,
    "absent":   0.00,
    "weak":     0.30,
    "moderate": 0.65,
    "strong":   0.90,
    "direct":   1.00,
}


def check_order_stability(
    engine,
    base_evidence: Dict[str, int],
    full_evidence_payload: Optional[Dict] = None,
) -> Dict:
    """
    Test whether the current evidence configuration is order-stable.

    Per Appendix Q §AQ.3.3.5.3 (non-commutativity), a classical Bayesian
    network treats evidence as order-independent: M₁M₂ρ = M₂M₁ρ. The
    diagnostic question is whether the current case posterior would
    materially shift if the order in which evidence were applied were
    reversed.

    pgmpy's Variable Elimination is itself commutative — the same evidence
    set produces the same posterior regardless of insertion order. This
    function does NOT contradict that mathematical fact. Instead, it tests
    the doctrinally-motivated permutation: what if only the *risk-typed*
    evidence had been entered (i.e. record reviewed before SCE), versus
    only the *contextual* evidence (i.e. SCE reviewed before record)?
    The legal-reasoning question Appendix Q raises is whether these
    partial states would converge on the current full-evidence state.

    Returns a dict with:
      - flagged: bool
      - severity: "high" | "moderate" | "none"
      - delta:  max |ΔN20| observed across the tested permutations
      - permutations: list of {label, posterior, delta} entries
      - note: one-paragraph diagnostic observation (not a recommendation)

    Reference: Appendix Q §AQ.3.3.5.3; Busemeyer & Bruza (2012) §6.
    """
    # Lazy import to avoid module-load circular dependency with model.py
    from model import query_do_risk

    # Establish the baseline — current full evidence
    base_results = query_do_risk(engine, base_evidence)
    base_n20 = float(base_results.get(20, 0.5))

    # Doctrinal classes of evidence (node-string keys in BN evidence dict)
    risk_keys    = {"2", "3", "4", "18"}      # violent history, PCL-R, Static-99R, dynamic risk
    distort_keys = {"5", "6", "12", "14", "17"}  # invalid tools, ineffective counsel, Gladue
                                                   # misapp, intergenerational trauma, collider

    permutations = []

    # Permutation A — risk-only frame (record reviewed first, SCE not yet weighted)
    risk_only = {k: v for k, v in base_evidence.items() if k in risk_keys}
    if risk_only:
        try:
            r = query_do_risk(engine, risk_only)
            n20_r = float(r.get(20, 0.5))
            permutations.append({
                "label": "Risk-typed evidence only (pre-SCE frame)",
                "posterior": round(n20_r, 4),
                "delta": round(abs(n20_r - base_n20), 4),
            })
        except Exception:
            pass

    # Permutation B — distortion/contextual-only frame (SCE reviewed first)
    distort_only = {k: v for k, v in base_evidence.items() if k in distort_keys}
    if distort_only:
        try:
            r = query_do_risk(engine, distort_only)
            n20_d = float(r.get(20, 0.5))
            permutations.append({
                "label": "Distortion-typed evidence only (SCE-first frame)",
                "posterior": round(n20_d, 4),
                "delta": round(abs(n20_d - base_n20), 4),
            })
        except Exception:
            pass

    # Permutation C — empty evidence (network priors only)
    try:
        r = query_do_risk(engine, {})
        n20_e = float(r.get(20, 0.5))
        permutations.append({
            "label": "Network priors (no evidence applied)",
            "posterior": round(n20_e, 4),
            "delta": round(abs(n20_e - base_n20), 4),
        })
    except Exception:
        pass

    if not permutations:
        return {
            "flagged": False,
            "severity": "none",
            "delta": 0.0,
            "permutations": [],
            "note": (
                "Order-stability check could not be run — insufficient evidence "
                "to construct meaningful permutations."
            ),
        }

    max_delta = max(p["delta"] for p in permutations)
    flagged = max_delta > ORDER_STABILITY_DELTA

    if max_delta > 2 * ORDER_STABILITY_DELTA:
        severity = "high"
    elif flagged:
        severity = "moderate"
    else:
        severity = "none"

    if flagged:
        note = (
            f"Posterior under reordered evidence frames diverges by up to "
            f"{max_delta:.1%} from the current state. Per Appendix Q §AQ.3.3.5.3, "
            f"this is the signature of non-commutativity in a doctrinally-motivated "
            f"reordering: the conclusion the inference engine would reach under a "
            f"risk-first or SCE-first review of the same record differs from the "
            f"conclusion it reaches when all evidence is jointly applied. "
            f"Threshold: {ORDER_STABILITY_DELTA:.0%} (research-prototype, illustrative)."
        )
    else:
        note = (
            f"Posterior under reordered evidence frames stays within "
            f"{max_delta:.1%} of the current state (threshold "
            f"{ORDER_STABILITY_DELTA:.0%}). Per Appendix Q §AQ.3.3.5.3, "
            f"the current configuration does not exhibit the signature "
            f"of non-commutativity associated with risk-first or SCE-first "
            f"narrative anchoring. This is an observation about the "
            f"present state, not a guarantee of order-independence "
            f"under different evidence."
        )

    return {
        "flagged": flagged,
        "severity": severity,
        "delta": round(max_delta, 4),
        "permutations": permutations,
        "note": note,
    }


def check_connection_gate_contextuality(
    engine,
    base_evidence: Dict[str, int],
    sce_corrections_by_gate: Optional[Dict[str, Dict[int, float]]] = None,
) -> Dict:
    """
    Test whether the current case posterior is contextually sensitive to
    the Morris para 97 connection-gate doctrinal call.

    Per Appendix Q §AQ.3.3.5.4 (contextuality, Kochen-Specker), the same
    evidentiary record may carry different probative weight under different
    interpretive frames. The PARVIS connection-gate doctrine — under
    which the strength of the systemic-context-to-offence connection
    modulates the weight of SCE corrections (cmult) — is one such frame.

    This function tests whether the posterior shifts meaningfully when
    the connection gate is set to "weak", "moderate", or "strong",
    holding all other evidence constant. A meaningful shift indicates
    the case is contextually sensitive: the doctrinal call about
    connection strength is consequential to the inference outcome.
    A null shift indicates the case is contextually robust.

    Parameters
    ----------
    engine : pgmpy VariableElimination
    base_evidence : current BN evidence dict
    sce_corrections_by_gate : optional dict of pre-computed SCE evidence
        modulated by each gate strength. If None, the function falls
        back to a simpler test using the raw evidence.

    Returns dict matching check_order_stability() shape.

    Reference: Appendix Q §AQ.3.3.5.4; Kochen & Specker (1967);
               R v Morris 2021 ONCA 680 §97.
    """
    from model import query_do_risk

    base_results = query_do_risk(engine, base_evidence)
    base_n20 = float(base_results.get(20, 0.5))

    gate_results = []

    # If the caller supplied pre-modulated SCE corrections per gate strength,
    # use them — this is the genuinely doctrinally-meaningful path because it
    # captures cmult()'s effect on SCE weights flowing into the BN.
    if sce_corrections_by_gate:
        for gate_label, sce_evidence in sce_corrections_by_gate.items():
            evidence_under_gate = dict(base_evidence)
            # SCE corrections modify probability values for distortion nodes;
            # convert to evidence-style 0/1 inputs by thresholding at 0.5.
            for nid, prob in sce_evidence.items():
                evidence_under_gate[str(nid)] = 1 if prob >= 0.5 else 0
            try:
                r = query_do_risk(engine, evidence_under_gate)
                n20 = float(r.get(20, 0.5))
                gate_results.append({
                    "gate": gate_label,
                    "weight": _CONN_GATE_WEIGHTS.get(gate_label, 0.65),
                    "posterior": round(n20, 4),
                    "delta_from_base": round(abs(n20 - base_n20), 4),
                })
            except Exception:
                pass
    else:
        # Fallback path — no gate-modulated SCE evidence supplied. The
        # contextuality check then degrades to comparing the base posterior
        # against itself, which yields a trivial null. This branch exists
        # so the function is robust when called without the full payload,
        # but the "real" diagnostic only fires when the caller supplies
        # sce_corrections_by_gate. Surface this honestly in the note.
        gate_results.append({
            "gate": "moderate (current)",
            "weight": _CONN_GATE_WEIGHTS["moderate"],
            "posterior": round(base_n20, 4),
            "delta_from_base": 0.0,
        })

    if len(gate_results) < 2:
        return {
            "flagged": False,
            "severity": "none",
            "delta": 0.0,
            "gates_tested": gate_results,
            "note": (
                "Connection-gate contextuality check could not be run — "
                "SCE evidence under alternative gate strengths was not "
                "supplied. To enable this diagnostic, the caller must "
                "pass pre-modulated SCE evidence per gate via "
                "sce_corrections_by_gate."
            ),
        }

    max_delta = max(g["delta_from_base"] for g in gate_results)
    flagged = max_delta > CONTEXTUALITY_GATE_DELTA

    if max_delta > 2 * CONTEXTUALITY_GATE_DELTA:
        severity = "high"
    elif flagged:
        severity = "moderate"
    else:
        severity = "none"

    if flagged:
        note = (
            f"The Node 20 posterior shifts by up to {max_delta:.1%} across "
            f"weak/moderate/strong settings of the Morris para 97 connection "
            f"gate. Per Appendix Q §AQ.3.3.5.4, this indicates contextual "
            f"sensitivity in the Kochen-Specker sense: the doctrinal call "
            f"about connection strength is consequential to the inference "
            f"outcome. The diagnostic surfaces the sensitivity; the choice "
            f"of gate strength remains a doctrinal question. Threshold: "
            f"{CONTEXTUALITY_GATE_DELTA:.0%} (research-prototype, illustrative)."
        )
    else:
        note = (
            f"Posterior remains within {max_delta:.1%} across weak/moderate/strong "
            f"settings of the Morris para 97 connection gate (threshold "
            f"{CONTEXTUALITY_GATE_DELTA:.0%}). Per Appendix Q §AQ.3.3.5.4, "
            f"the current case is contextually robust: the inference outcome "
            f"does not numerically depend on the connection-gate strength "
            f"chosen. The doctrinal choice between gate strengths remains "
            f"a question of legal reasoning, not foreclosed by the diagnostic."
        )

    return {
        "flagged": flagged,
        "severity": severity,
        "delta": round(max_delta, 4),
        "gates_tested": gate_results,
        "note": note,
    }


def diagnose(
    posteriors: Dict[int, float],
    evidence: Dict[str, int],
    gladue_checked: List[str],
    sce_checked: List[str],
    profile_ev: Dict[int, float],
    connection_strength: str = "moderate",
    *,
    engine=None,
    sce_corrections_by_gate: Optional[Dict[str, Dict[int, float]]] = None,
) -> Dict:
    """
    Run all four QBism diagnostics. Returns structured diagnostic report.

    Parameters
    ----------
    posteriors : node_id → P(High) from Variable Elimination
    evidence   : observed evidence fed into the BN {node_str: 0|1}
    gladue_checked : list of checked Gladue factor IDs
    sce_checked    : list of checked Morris/Ellis SCE factor IDs
    profile_ev     : case profile node evidence {node_id: probability}
    connection_strength : Morris para 97 connection gate value

    Returns
    -------
    dict with keys: prior_contamination, order_effects, contextual_interference,
                    belief_stasis, scalar_collapse_risk, overall_flag, summary
    """

    diags = {}

    # ── 1. Prior contamination ─────────────────────────────────────────────────
    # Nodes with elevated posteriors but no corresponding evidence entered
    # may reflect inherited distorted priors (criminal record, actuarial scores)
    contaminated = []
    distortion_nodes = {5, 6, 7, 8, 12, 14, 16, 17}
    for node_id in distortion_nodes:
        p = posteriors.get(node_id, 0.5)
        has_evidence = (str(node_id) in evidence) or (node_id in profile_ev)
        if p > PRIOR_CONTAMINATION_THRESHOLD and not has_evidence:
            contaminated.append({
                "node": node_id,
                "posterior": round(p, 3),
                "note": f"Node {node_id} elevated ({p:.1%}) without case-specific evidence — "
                        f"prior may reflect structurally contaminated baseline."
            })

    diags["prior_contamination"] = {
        "flagged": len(contaminated) > 0,
        "severity": "high" if len(contaminated) >= 3 else "moderate" if contaminated else "none",
        "items": contaminated,
        "doctrine": "Bayes' theorem does not correct distorted priors — it propagates them. "
                    "Per AQ.3.3.2: epistemic contamination at P(H) level is inherited, not neutralized.",
    }

    # ── 2. Order effects (non-commutativity) ──────────────────────────────────
    # Detect when criminal record / actuarial score evidence was entered BEFORE
    # Gladue / SCE / IRCA material — classical model treats this as commutative
    # but legal reasoning does not (AQ.3.3.3)
    risk_evidence_entered = any(str(n) in evidence for n in [2, 3, 4, 18])
    sce_entered = len(gladue_checked) > 0 or len(sce_checked) > 0
    report_commissioned = profile_ev.get(12, 0.60) < 0.50  # Lower = report commissioned

    order_flags = []
    if risk_evidence_entered and not sce_entered:
        order_flags.append(
            "Risk factor evidence entered without corresponding Gladue / Morris-Ellis SCE. "
            "Classical model treats this as order-neutral; legal reasoning does not. "
            "Posterior may anchor to risk-first narrative (AQ.3.3.3, M₁M₂ρ ≠ M₂M₁ρ)."
        )
    if risk_evidence_entered and sce_entered and not report_commissioned:
        order_flags.append(
            "SCE factors checked but no formal Gladue / IRCA report commissioned. "
            "Contextual evidence without procedural grounding may carry reduced weight. "
            "Order effect: actuarial framing likely precedes contextual revision."
        )

    diags["order_effects"] = {
        "flagged": len(order_flags) > 0,
        "severity": "high" if len(order_flags) >= 2 else "moderate" if order_flags else "none",
        "items": order_flags,
        "doctrine": "Non-commutativity (AQ.3.3.3): evidentiary sequence materially alters "
                    "posterior beliefs. Criminal record reviewed before Gladue ≠ Gladue reviewed first. "
                    "Classical Bayesian inference assumes order-independence — a legally questionable assumption.",
    }

    # ── 3. Contextual interference ────────────────────────────────────────────
    # P(H | C1) ≠ P(H | C2) where C1 = actuarial context, C2 = Gladue/Morris context
    # Flag when the DO posterior would shift meaningfully across interpretive contexts
    do_posterior = posteriors.get(20, 0.5)
    gladue_weight = len(gladue_checked) * 0.08      # rough proxy for SCE weight
    sce_weight = len(sce_checked) * 0.06

    # Simulated counterfactual: what would DO be under pure actuarial context?
    # (remove SCE corrections)
    do_actuarial_proxy = min(0.95, do_posterior + gladue_weight + sce_weight)
    do_contextual_proxy = do_posterior
    context_delta = abs(do_actuarial_proxy - do_contextual_proxy)

    context_flags = []
    if context_delta > ORDER_EFFECT_DELTA:
        context_flags.append({
            "actuarial_context": round(do_actuarial_proxy, 3),
            "gladue_morris_context": round(do_contextual_proxy, 3),
            "delta": round(context_delta, 3),
            "note": f"DO designation risk shifts {context_delta:.1%} across interpretive contexts. "
                    f"P(H|C_actuarial) = {do_actuarial_proxy:.1%} vs P(H|C_Gladue/Morris) = {do_contextual_proxy:.1%}. "
                    f"Contextuality (AQ.3.3.4): same evidence, different probative meaning."
        })

    connection_flag = None
    if connection_strength in ("none", "absent", "weak") and sce_checked:
        connection_flag = (
            f"Morris para 97 connection gate set to '{connection_strength}' while "
            f"{len(sce_checked)} SCE factors checked. Low connection weight suppresses "
            f"contextual correction — risk that contextual evidence is formally acknowledged "
            f"but substantively inert. Classic belief stasis pattern."
        )
        context_flags.append({"morris_gate": connection_flag})

    diags["contextual_interference"] = {
        "flagged": len(context_flags) > 0,
        "severity": "high" if context_delta > 0.15 else "moderate" if context_flags else "none",
        "items": context_flags,
        "doctrine": "Contextuality (AQ.3.3.4, Kochen-Specker): P(H|C₁) ≠ P(H|C₂). "
                    "Probative meaning of evidence is context-dependent. "
                    "Actuarial and Gladue/Morris frameworks may yield different risk assessments "
                    "for identical evidentiary records — not irrationality, but relational inference.",
    }

    # ── 4. Belief stasis detection ────────────────────────────────────────────
    # SCE entered but DO posterior remains high — suggests SCE is acknowledged
    # but not substantively integrating into belief revision
    stasis_flags = []
    if sce_entered and do_posterior > 0.65:
        stasis_flags.append(
            f"Substantial SCE entered ({len(gladue_checked)} Gladue + {len(sce_checked)} Morris/Ellis) "
            f"but DO designation risk remains {do_posterior:.1%}. "
            f"This may indicate belief stasis — SCE acknowledged but inert. "
            f"Per Kerr & Ewing (2023): courts cite Gladue without revising culpability. "
            f"Classical model may be propagating distorted priors faster than SCE corrections apply."
        )

    # Premature scalar collapse — actuarial nodes hardened to High
    collapsed_nodes = [
        n for n in COLLAPSE_RISK_NODES
        if posteriors.get(n, 0) > 0.80 and str(n) not in evidence
    ]
    if collapsed_nodes:
        stasis_flags.append(
            f"Nodes {collapsed_nodes} have collapsed to High (>80%) without direct evidence. "
            f"Actuarial recursion: distorted records feeding forward as risk signals (AQ.3.3.4). "
            f"Scalar resolution may have occurred prematurely — uncertainty foreclosed before "
            f"all SCE was reviewed."
        )

    diags["belief_stasis"] = {
        "flagged": len(stasis_flags) > 0,
        "severity": "high" if (sce_entered and do_posterior > 0.75) else "moderate" if stasis_flags else "none",
        "items": stasis_flags,
        "doctrine": "Belief stasis (AQ.3.3.4, Kerr & Ewing 2023): formally valid probabilistic "
                    "update may be normatively suspect where SCE is acknowledged but does not "
                    "alter the structure of reasoning. Premature scalar collapse (AQ.3.3.4): "
                    "point estimates may overstate epistemic certainty.",
    }

    # ── 5. Order stability (Appendix Q §AQ.3.3.5.3) ──────────────────────────
    # Run only when caller supplies the inference engine. When engine is None,
    # this slot returns a neutral "not_run" payload so the diagnostic dict
    # shape stays predictable for any downstream consumer.
    if engine is not None:
        diags["order_stability"] = check_order_stability(engine, evidence)
    else:
        diags["order_stability"] = {
            "flagged": False,
            "severity": "not_run",
            "delta": 0.0,
            "permutations": [],
            "note": "Order-stability check requires inference engine; not supplied.",
        }

    # ── 6. Connection-gate contextuality (Appendix Q §AQ.3.3.5.4) ─────────────
    # Run only when caller supplies both the engine and the per-gate SCE
    # correction payload. The latter captures cmult()'s modulation effect.
    if engine is not None and sce_corrections_by_gate:
        diags["connection_gate_contextuality"] = check_connection_gate_contextuality(
            engine, evidence, sce_corrections_by_gate
        )
    else:
        diags["connection_gate_contextuality"] = {
            "flagged": False,
            "severity": "not_run",
            "delta": 0.0,
            "gates_tested": [],
            "note": ("Connection-gate contextuality check requires inference engine "
                     "and per-gate SCE evidence payload; not supplied."),
        }

    # ── Superposition state indicator ─────────────────────────────────────────
    # Represents pre-decisional ambiguity — both risk and mitigation narratives live
    # Computed as closeness to 0.5 of DO posterior (maximally superposed = 0.5)
    superposition_index = 1.0 - abs(do_posterior - 0.5) * 2
    diags["superposition_index"] = round(superposition_index, 3)
    diags["superposition_note"] = (
        f"Belief state superposition index: {superposition_index:.2f} "
        f"(1.0 = maximally ambiguous, 0.0 = fully resolved). "
        f"{'High ambiguity — competing narratives remain live. Judicial commitment premature.' if superposition_index > 0.7 else 'Moderate ambiguity.' if superposition_index > 0.4 else 'Belief state largely resolved toward ' + ('High risk.' if do_posterior > 0.5 else 'Low risk.')}"
    )

    # ── Overall flag ───────────────────────────────────────────────────────────
    severity_map = {"high": 3, "moderate": 2, "none": 0}
    max_severity = max(
        severity_map.get(diags["prior_contamination"]["severity"], 0),
        severity_map.get(diags["order_effects"]["severity"], 0),
        severity_map.get(diags["contextual_interference"]["severity"], 0),
        severity_map.get(diags["belief_stasis"]["severity"], 0),
    )
    diags["overall_flag"] = {3: "high", 2: "moderate", 0: "none"}.get(max_severity, "none")

    # ── Summary ────────────────────────────────────────────────────────────────
    active = [k for k in ["prior_contamination", "order_effects", "contextual_interference", "belief_stasis"]
              if diags[k]["flagged"]]
    diags["summary"] = (
        f"QBism diagnostic: {len(active)} condition(s) flagged — {', '.join(active) if active else 'no conditions flagged'}. "
        f"Classical VE output is mathematically coherent. "
        + ("Heightened scrutiny warranted." if active else "No epistemic pressure points detected.")
    )

    return diags


def format_report(diags: Dict) -> str:
    """Format QBism diagnostics as audit text."""
    lines = [
        "QUANTUM BAYESIANISM (QBism) DIAGNOSTIC REPORT",
        "Appendix Q: The Limits of Classical Bayesian Inference",
        "──────────────────────────────────────────────────────────",
        "",
        f"Overall flag:           {diags['overall_flag'].upper()}",
        f"Superposition index:    {diags['superposition_index']} / 1.0",
        f"Summary:                {diags['summary']}",
        "",
    ]

    checks = [
        ("PRIOR CONTAMINATION", "prior_contamination"),
        ("ORDER EFFECTS (NON-COMMUTATIVITY)", "order_effects"),
        ("CONTEXTUAL INTERFERENCE", "contextual_interference"),
        ("BELIEF STASIS / SCALAR COLLAPSE", "belief_stasis"),
    ]

    for title, key in checks:
        d = diags[key]
        lines += [
            f"{title}",
            f"  Status:   {d['severity'].upper()}",
            f"  Flagged:  {'Yes' if d['flagged'] else 'No'}",
        ]
        if d["items"]:
            for item in d["items"]:
                if isinstance(item, str):
                    lines.append(f"  ▸ {item}")
                elif isinstance(item, dict):
                    for k, v in item.items():
                        lines.append(f"  ▸ {k}: {v}")
        lines += [f"  Doctrine: {d['doctrine']}", ""]

    lines += [
        "──────────────────────────────────────────────────────────",
        "NOTE: This diagnostic does not alter the VE posterior.",
        "It identifies conditions warranting heightened scrutiny.",
        "Per AQ.4: QBism operates as an epistemic audit mechanism,",
        "not a substitute inferential engine.",
    ]
    return "\n".join(lines)
