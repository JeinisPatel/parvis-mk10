"""
Record analysis — pattern detection over a criminal record.

Takes a list of convictions and computes:

  - Boutilier pattern classification: escalating / stable / de-escalating /
    desistance (5+ year gap from most recent)
  - Aggregate seriousness weight + per-conviction breakdown
  - Doctrinal implications: which nodes a given record engages and why
  - Per-conviction reliability flags: was bail denied; was counsel
    inadequate; was the conviction in a jurisdiction with documented
    over-policing concerns

This is a Mk 9 helper, not a Mk 8 engine module. It lives in
parvis_engine/_record_analysis.py (note leading underscore) so it's
clearly distinct from the verbatim Mk 8 files alongside it.

Doctrinal anchors:
  - R v Boutilier 2017 SCC 64 (pattern of behaviour, dangerousness)
  - R v Friesen 2020 SCC 9 (temporal recalibration of historical convictions)
  - R v Le 2019 SCC 34 (over-policing as evidentiary contamination)
  - R v Antic 2017 SCC 27 (bail denial → wrongful guilty plea cascade)
  - Patel (2026) Ch.5 §5.1.20 (record-reliability multiplier)
"""

from datetime import date
from typing import Literal, Any


# ── Offence taxonomy ─────────────────────────────────────────────────────────
# Categories map to a seriousness weight in [0.1, 1.0]. The weight is what
# the engine's record-reliability multiplier ultimately responds to.

OFFENCE_CATEGORIES: dict[str, dict[str, Any]] = {
    "homicide": {
        "label":     "Homicide / manslaughter",
        "weight":    1.00,
        "violent":   True,
        "sexual":    False,
        "boutilier_eligible": True,
    },
    "serious_violence": {
        "label":     "Aggravated assault / armed robbery",
        "weight":    0.85,
        "violent":   True,
        "sexual":    False,
        "boutilier_eligible": True,
    },
    "sexual_offence": {
        "label":     "Sexual offence",
        "weight":    0.90,
        "violent":   True,
        "sexual":    True,
        "boutilier_eligible": True,
    },
    "domestic_violence": {
        "label":     "Domestic / intimate-partner violence",
        "weight":    0.70,
        "violent":   True,
        "sexual":    False,
        "boutilier_eligible": True,
    },
    "assault_minor": {
        "label":     "Assault (non-aggravated)",
        "weight":    0.40,
        "violent":   True,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "weapons": {
        "label":     "Weapons offence",
        "weight":    0.55,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": True,
    },
    "drug_trafficking": {
        "label":     "Drug trafficking",
        "weight":    0.50,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "drug_possession": {
        "label":     "Drug possession",
        "weight":    0.20,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "property_serious": {
        "label":     "Break-and-enter / serious property",
        "weight":    0.35,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "property_minor": {
        "label":     "Theft / minor property",
        "weight":    0.15,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "administration_justice": {
        "label":     "Administration of justice (breach, fail to appear)",
        "weight":    0.10,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "driving": {
        "label":     "Impaired / dangerous driving",
        "weight":    0.30,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
    "other": {
        "label":     "Other (specify in notes)",
        "weight":    0.25,
        "violent":   False,
        "sexual":    False,
        "boutilier_eligible": False,
    },
}


SENTENCE_TYPES = [
    "absolute_discharge", "conditional_discharge", "fine", "probation",
    "conditional_sentence", "custody_provincial", "custody_federal",
    "indeterminate", "other",
]


# ── Pattern detection ────────────────────────────────────────────────────────

Pattern = Literal["escalating", "stable", "de_escalating", "desistance", "insufficient"]


def _classify_pattern(convictions: list[dict]) -> tuple[Pattern, str]:
    """Classify the record's overall trajectory.

    `escalating`     — later convictions notably more serious than earlier
    `de_escalating`  — later convictions notably less serious
    `stable`         — similar seriousness throughout
    `desistance`     — 5+ year gap between most recent conviction and today
    `insufficient`   — fewer than 2 convictions to compare
    """
    if not convictions:
        return ("insufficient", "No convictions recorded.")
    if len(convictions) < 2:
        return ("insufficient", "Only one conviction recorded — pattern indeterminate.")

    sorted_by_year = sorted(
        [c for c in convictions if c.get("year") is not None],
        key=lambda c: c["year"],
    )
    if len(sorted_by_year) < 2:
        return ("insufficient", "Years missing on most convictions — pattern indeterminate.")

    # Desistance check first: 5+ years since most recent.
    most_recent_year = sorted_by_year[-1]["year"]
    current_year     = date.today().year
    if (current_year - most_recent_year) >= 5:
        return (
            "desistance",
            f"No new convictions in {current_year - most_recent_year} years — "
            "desistance pattern under Boutilier §62 considerations.",
        )

    # Compare early vs late seriousness.
    n = len(sorted_by_year)
    early = sorted_by_year[: n // 2]
    late  = sorted_by_year[(n + 1) // 2 :]
    early_avg = sum(_seriousness(c) for c in early) / max(len(early), 1)
    late_avg  = sum(_seriousness(c) for c in late)  / max(len(late),  1)

    delta = late_avg - early_avg
    if delta >= 0.15:
        return (
            "escalating",
            f"Later convictions average {late_avg:.2f} seriousness vs {early_avg:.2f} earlier — "
            "escalating pattern engages Boutilier dynamic-risk reasoning (N4).",
        )
    if delta <= -0.15:
        return (
            "de_escalating",
            f"Later convictions average {late_avg:.2f} seriousness vs {early_avg:.2f} earlier — "
            "de-escalating pattern; consider rehabilitation context.",
        )
    return (
        "stable",
        f"Similar seriousness throughout (early {early_avg:.2f}, late {late_avg:.2f}) — "
        "stable trajectory; no clear escalation signal.",
    )


def _seriousness(conviction: dict) -> float:
    cat = conviction.get("category", "other")
    return float(OFFENCE_CATEGORIES.get(cat, OFFENCE_CATEGORIES["other"])["weight"])


# ── Doctrinal implications ────────────────────────────────────────────────────

def _doctrinal_implications(convictions: list[dict], pattern: Pattern) -> list[dict]:
    """Return per-node advisory implications based on the record.

    Each implication has the shape:
        {
            "node":       "7",
            "node_name":  "Bail-denial cascade",
            "type":       "advisory" | "strong",
            "note":       "…",
            "anchor":     "R v Antic 2017 SCC 27",
        }
    """
    implications: list[dict] = []

    if not convictions:
        return implications

    # ── N7 Bail-denial cascade ───────────────────────────────────────────────
    bail_denied_count = sum(1 for c in convictions if c.get("bail_denied"))
    if bail_denied_count >= 1:
        implications.append({
            "node":      "7",
            "node_name": "Bail-denial cascade",
            "side":      "defence",
            "type":      "strong" if bail_denied_count >= 2 else "advisory",
            "note": (
                f"{bail_denied_count} prior conviction(s) followed bail denial. "
                "Antic warns that bail-denial conditions can produce wrongful guilty pleas; "
                "convictions entered under those conditions may not reflect culpable conduct."
            ),
            "anchor":    "R v Antic 2017 SCC 27",
        })

    # ── N6 Ineffective counsel ───────────────────────────────────────────────
    iac_count = sum(1 for c in convictions if c.get("counsel_inadequate"))
    if iac_count >= 1:
        implications.append({
            "node":      "6",
            "node_name": "Ineffective counsel",
            "side":      "defence",
            "type":      "strong" if iac_count >= 2 else "advisory",
            "note": (
                f"{iac_count} prior conviction(s) where counsel was flagged as inadequate. "
                "Ineffective assistance under R v G.D.B. compromises the reliability of "
                "the resulting plea or finding."
            ),
            "anchor":    "R v G.D.B. 2000 SCC 22",
        })

    # ── N17 Over-policing ─────────────────────────────────────────────────────
    overpoliced_count = sum(1 for c in convictions if c.get("overpoliced_jurisdiction"))
    if overpoliced_count >= 1:
        implications.append({
            "node":      "17",
            "node_name": "Over-policing & epistemic contamination",
            "side":      "defence",
            "type":      "strong" if overpoliced_count >= 2 else "advisory",
            "note": (
                f"{overpoliced_count} conviction(s) in jurisdictions with documented "
                "over-policing of the relevant community. Per R v Le, the record may "
                "reflect heightened surveillance rather than heightened criminality."
            ),
            "anchor":    "R v Le 2019 SCC 34",
        })

    # ── N14 Temporal distortion ──────────────────────────────────────────────
    current_year = date.today().year
    old_convictions = [
        c for c in convictions
        if c.get("year") is not None and (current_year - c["year"]) >= 15
    ]
    if len(old_convictions) >= 1:
        implications.append({
            "node":      "14",
            "node_name": "Temporal distortion",
            "side":      "defence",
            "type":      "strong" if len(old_convictions) >= 2 else "advisory",
            "note": (
                f"{len(old_convictions)} conviction(s) more than 15 years old. "
                "Per R v Friesen, sentencing norms have shifted substantially; "
                "historical convictions may not carry their original weight."
            ),
            "anchor":    "R v Friesen 2020 SCC 9",
        })

    # ── N4 Dynamic risk (engaged by escalation pattern) ─────────────────────
    if pattern == "escalating":
        implications.append({
            "node":      "4",
            "node_name": "Dynamic Risk Factor Cluster",
            "side":      "defence",
            "type":      "advisory",
            "note": (
                "Escalating pattern engages dynamic-risk reasoning under Boutilier. "
                "Consider whether the escalation reflects substantive risk or "
                "increasing systemic intervention."
            ),
            "anchor":    "R v Boutilier 2017 SCC 64",
        })

    # ── N9 Intergenerational trauma (advisory if desistance + early convictions) ──
    if pattern == "desistance":
        implications.append({
            "node":      "9",
            "node_name": "Intergenerational trauma (mitigation)",
            "side":      "defence",
            "type":      "advisory",
            "note": (
                "Desistance pattern is mitigation-relevant. Consider whether "
                "structural factors that produced the original convictions have changed."
            ),
            "anchor":    "R v Ipeelee 2012 SCC 13 §74",
        })

    # ── N19 Collider bias (advisory if record is dense but recent is mitigated) ──
    if pattern == "de_escalating" and len(convictions) >= 4:
        implications.append({
            "node":      "19",
            "node_name": "Collider bias",
            "side":      "defence",
            "type":      "advisory",
            "note": (
                "Dense early record with de-escalation invites a collider-bias reading: "
                "the visible record may over-represent the surveilled period of the "
                "offender's life rather than their overall trajectory."
            ),
            "anchor":    "Patel (2026) Ch.5 §5.1.19 §8",
        })

    # ── N2 SPIO predicate (s.752(a) gate) [CROWN] ────────────────────────────
    spio_count = sum(1 for c in convictions
                     if OFFENCE_CATEGORIES.get(c.get("category"), {}).get("boutilier_eligible"))
    if spio_count >= 1:
        implications.append({
            "node":      "2",
            "node_name": "Violent history (SPIO predicate)",
            "type":      "strong" if spio_count >= 2 else "advisory",
            "side":      "crown",
            "note": (
                f"{spio_count} conviction(s) qualify as serious personal injury offences, "
                "engaging the s.752(a) predicate for a dangerous-offender application. "
                "Per Steele this is a binary precondition satisfied by any qualifying "
                "violence; it does not by itself establish the pattern or the threat."
            ),
            "anchor":    "R v Steele 2014 SCC 61; Criminal Code s.752",
        })

    # ── N2 Repetitive violent pattern (s.753(1)(a)(i)) [CROWN] ───────────────
    violent_elig = [c for c in convictions
                    if OFFENCE_CATEGORIES.get(c.get("category"), {}).get("violent")
                    and OFFENCE_CATEGORIES.get(c.get("category"), {}).get("boutilier_eligible")]
    if pattern == "escalating" or len(violent_elig) >= 2:
        implications.append({
            "node":      "2",
            "node_name": "Violent history (pattern)",
            "type":      "strong" if (pattern == "escalating" and len(violent_elig) >= 2) else "advisory",
            "side":      "crown",
            "note": (
                "The record supports a pattern of repetitive violent behaviour under "
                "s.753(1)(a)(i), from which the Crown may argue a failure to restrain. "
                "A pattern alone cannot establish the statutory threat: the likelihood-"
                "of-harm prong requires corroborating dynamic-risk evidence (N4), and the "
                "audit caps a pattern-only inference below the threat band."
            ),
            "anchor":    "Criminal Code s.753(1)(a)(i); R v Boutilier 2017 SCC 64",
        })

    # ── N3 Failure to control sexual impulses (s.753(1)(b)) [CROWN] ──────────
    sexual_convs = [c for c in convictions
                    if OFFENCE_CATEGORIES.get(c.get("category"), {}).get("sexual")]
    if len(sexual_convs) >= 1:
        implications.append({
            "node":      "3",
            "node_name": "Sexual offence profile",
            "type":      "strong" if len(sexual_convs) >= 2 else "advisory",
            "side":      "crown",
            "note": (
                f"{len(sexual_convs)} sexual offence conviction(s). The Crown may invoke "
                "s.753(1)(b): a likelihood of causing injury through failure to control "
                "sexual impulses. This leans on the actuarial pathway (N3/N4); under Ewert "
                "the inference holds only where the instrument is validated for the "
                "offender's population."
            ),
            "anchor":    "Criminal Code s.753(1)(b); Ewert v Canada 2018 SCC 30",
        })

    # ── N2 Brutal conduct (s.753(1)(a)(iii)) [CROWN] ─────────────────────────
    brutal_convs = [c for c in convictions if c.get("brutal")]
    if len(brutal_convs) >= 1:
        implications.append({
            "node":      "2",
            "node_name": "Violent history (brutality)",
            "type":      "strong",
            "side":      "crown",
            "note": (
                f"{len(brutal_convs)} conviction(s) involve conduct flagged as brutal. "
                "The Crown may invoke s.753(1)(a)(iii): behaviour so brutal as to compel "
                "the conclusion that future conduct is unlikely to be inhibited by normal "
                "standards of restraint. Brutality is assessed on the individual facts of "
                "each offence, whether current or historical."
            ),
            "anchor":    "Criminal Code s.753(1)(a)(iii)",
        })

    return implications


# ── Aggregate stats ──────────────────────────────────────────────────────────

def _aggregate(convictions: list[dict]) -> dict:
    if not convictions:
        return {
            "count":             0,
            "violent_count":     0,
            "sexual_count":      0,
            "weight_sum":        0.0,
            "weight_mean":       0.0,
            "earliest_year":     None,
            "most_recent_year":  None,
            "span_years":        None,
        }
    weights  = [_seriousness(c) for c in convictions]
    years    = [c["year"] for c in convictions if c.get("year") is not None]
    cats     = [OFFENCE_CATEGORIES.get(c.get("category", "other"), OFFENCE_CATEGORIES["other"])
                for c in convictions]
    return {
        "count":            len(convictions),
        "violent_count":    sum(1 for c in cats if c["violent"]),
        "sexual_count":     sum(1 for c in cats if c["sexual"]),
        "weight_sum":       round(sum(weights), 3),
        "weight_mean":      round(sum(weights) / len(weights), 3),
        "earliest_year":    min(years) if years else None,
        "most_recent_year": max(years) if years else None,
        "span_years":       (max(years) - min(years)) if len(years) >= 2 else None,
    }


# ── Public API ───────────────────────────────────────────────────────────────

def analyse_record(convictions: list[dict]) -> dict:
    """Top-level entry point. Takes a list of convictions, returns analysis."""
    pattern, pattern_note = _classify_pattern(convictions)
    return {
        "pattern":         pattern,
        "pattern_note":    pattern_note,
        "aggregate":       _aggregate(convictions),
        "implications":    _doctrinal_implications(convictions, pattern),
        "categories":      {k: v["label"] for k, v in OFFENCE_CATEGORIES.items()},
        "sentence_types":  SENTENCE_TYPES,
    }