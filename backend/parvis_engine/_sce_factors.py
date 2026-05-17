"""
SCE factors — Social Context Evidence scaffolding for the SCE submission
screen, anchored in:

    Morris    — R v Morris, 2021 ONCA 680 (SCE methodological framework)
    Anderson  — R v Anderson, 2021 NSCA 62 (IRCA-endorsing companion)
    Ellis     — applied case (Morris methodology in sentencing practice)
    Sharma    — R v Sharma, 2022 SCC 39 (constitutional anchor for s.15
                Charter analysis of SCE-bearing sentencing)

Where Gladue is the doctrinal vehicle for Indigenous-specific systemic-
context evidence, SCE is the parallel vehicle for non-Indigenous racialised
contexts. The structure is methodologically distinct: rather than a list
of categorical heritage facts (residential schools, loss of culture), SCE
is organised around three axes:

    evidence_types          — what is being marshalled before the court
    systemic_patterns       — what the evidence establishes
    sentencing_implications — what the SCE means for the sanction

This module is a Mk 9 helper, not a Mk 8 engine file.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SCEFactor:
    key:           str
    label:         str
    category:      str   # 'evidence_types' | 'systemic_patterns' | 'sentencing_implications'
    case_anchor:   str
    description:   str
    suggests_node: Optional[str] = None


# ── Evidence types (Morris ¶74, ¶82; Anderson ¶119) ─────────────────────────
# What the defence is putting before the court. The procedural piece of
# SCE — distinct from Gladue, which assumes the heritage facts.

_EVIDENCE_TYPES: tuple[SCEFactor, ...] = (
    SCEFactor(
        key="irca_commissioned",
        label="IRCA commissioned",
        category="evidence_types",
        case_anchor="Anderson ¶119",
        description=(
            "Impact of Race and Culture Assessment commissioned for this "
            "client. The signature procedural mechanism endorsed by "
            "Anderson for putting systemic context before a sentencing "
            "court."
        ),
    ),
    SCEFactor(
        key="expert_sociological",
        label="Expert sociological / historical report",
        category="evidence_types",
        case_anchor="Morris ¶74",
        description=(
            "Academic expert evidence on the relevant community's "
            "history, structural conditions, and intergenerational "
            "patterns."
        ),
    ),
    SCEFactor(
        key="expert_mental_health_cultural",
        label="Culturally-competent mental health report",
        category="evidence_types",
        case_anchor="Morris ¶74",
        description=(
            "Expert mental-health report attentive to how cultural, "
            "racial, or immigration trauma manifests — distinct from a "
            "generic psychological assessment."
        ),
    ),
    SCEFactor(
        key="statistical_structural",
        label="Statistical / structural evidence",
        category="evidence_types",
        case_anchor="Morris ¶85",
        description=(
            "Sentencing disparities, incarceration rates, stop-and-search "
            "data. Morris ¶85 admits judicial notice for established "
            "structural patterns."
        ),
    ),
    SCEFactor(
        key="community_impact",
        label="Community impact statements / affidavits",
        category="evidence_types",
        case_anchor="Morris ¶82",
        description=(
            "Affidavit evidence from community members, professionals, "
            "or organisations contextualising the offence and the "
            "accused's place in the community."
        ),
    ),
    SCEFactor(
        key="defendant_evidence",
        label="Defendant's own evidence / affidavit",
        category="evidence_types",
        case_anchor="Morris ¶82",
        description=(
            "The accused's own testimony or affidavit speaking to "
            "their pathway and the role of systemic factors."
        ),
    ),
    SCEFactor(
        key="documentary_records",
        label="Documentary records (school / employment / medical)",
        category="evidence_types",
        case_anchor="Morris ¶74",
        description=(
            "Records showing systemic factors as lived — interrupted "
            "schooling, employment discrimination patterns, medical "
            "service gaps, housing instability."
        ),
    ),
)


# ── Systemic patterns established (Morris ¶74, ¶85; Anderson ¶119) ──────────
# The substantive content of SCE. Broad scope — Black, Asian, South Asian,
# refugee/immigrant, and other racialised systemic contexts.

_SYSTEMIC_PATTERNS: tuple[SCEFactor, ...] = (
    SCEFactor(
        key="anti_black_racism",
        label="Anti-Black racism documented in record",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Morris's original factual context: documented anti-Black "
            "racism in policing, prosecution, and sentencing in the "
            "relevant jurisdiction."
        ),
        suggests_node="N14",
    ),
    SCEFactor(
        key="over_policing_documented",
        label="Over-policing in jurisdiction",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Statistical or testimonial evidence of disproportionate "
            "police contact with the relevant demographic in the "
            "relevant geography."
        ),
        suggests_node="N14",
    ),
    SCEFactor(
        key="sentencing_disparities",
        label="Sentencing disparities for demographic",
        category="systemic_patterns",
        case_anchor="Morris ¶85",
        description=(
            "Established sentencing-outcome disparities between the "
            "relevant demographic and the comparator. Morris ¶85 admits "
            "judicial notice for well-documented patterns."
        ),
        suggests_node="N16",
    ),
    SCEFactor(
        key="intergenerational_displacement",
        label="Intergenerational slavery / segregation effects",
        category="systemic_patterns",
        case_anchor="Anderson ¶119",
        description=(
            "Anderson context for African Nova Scotian and other Black "
            "communities with documented intergenerational effects of "
            "slavery, displacement, and segregation."
        ),
    ),
    SCEFactor(
        key="educational_discrimination",
        label="Educational discrimination experienced",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Documented school-level discrimination, disciplinary "
            "disparities, or streaming away from academic tracks."
        ),
    ),
    SCEFactor(
        key="housing_segregation",
        label="Housing discrimination / residential segregation",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Structural housing instability or discrimination affecting "
            "the accused or their community."
        ),
    ),
    SCEFactor(
        key="mental_health_service_gaps",
        label="Mental health service gaps for community",
        category="systemic_patterns",
        case_anchor="Ellis",
        description=(
            "Absence of culturally competent mental-health or "
            "addictions services in the community at the relevant time."
        ),
    ),
    SCEFactor(
        key="refugee_immigration_trauma",
        label="Refugee / immigration trauma",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Forced migration, refugee processing trauma, family "
            "separation in immigration context. Morris methodology has "
            "been extended to immigration-trauma cases post-2021."
        ),
    ),
    SCEFactor(
        key="anti_asian_racism",
        label="Anti-Asian racism / hate-crime climate",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Post-2020 application of Morris methodology to anti-Asian "
            "violence and hate-crime climate affecting the accused's "
            "community."
        ),
    ),
    SCEFactor(
        key="economic_marginalisation",
        label="Economic marginalisation tied to systemic factors",
        category="systemic_patterns",
        case_anchor="Morris ¶74",
        description=(
            "Employment discrimination, wage gaps, exclusion from "
            "economic opportunity as structural facts traceable to "
            "racialised systemic patterns."
        ),
    ),
    SCEFactor(
        key="specific_historical_event",
        label="Specific historical injustice",
        category="systemic_patterns",
        case_anchor="Anderson ¶119",
        description=(
            "Identifiable historical injustice with documented "
            "intergenerational effects — Africville displacement, "
            "Japanese internment, Komagata Maru, etc."
        ),
    ),
)


# ── Sentencing implications (Morris ¶74; Sharma ¶78) ────────────────────────

_SENTENCING_IMPLICATIONS: tuple[SCEFactor, ...] = (
    SCEFactor(
        key="diminished_moral_culpability_charter",
        label="Diminished moral culpability (Charter s.15)",
        category="sentencing_implications",
        case_anchor="Morris ¶74",
        description=(
            "Where systemic factors are causally connected to the "
            "offending pathway, moral culpability is diminished — "
            "Morris's central proposition, anchored constitutionally "
            "by Sharma ¶78."
        ),
    ),
    SCEFactor(
        key="incarceration_inappropriate",
        label="Incarceration inappropriate in this case",
        category="sentencing_implications",
        case_anchor="Morris ¶74",
        description=(
            "Where SCE evidence is properly weighed, a custodial "
            "disposition is not the proportionate response."
        ),
    ),
    SCEFactor(
        key="community_supervision_feasible",
        label="Community-based supervision feasible",
        category="sentencing_implications",
        case_anchor="Ellis",
        description=(
            "Concrete supervision capacity exists in the accused's "
            "community of origin or current residence."
        ),
    ),
    SCEFactor(
        key="restorative_available",
        label="Restorative justice options available",
        category="sentencing_implications",
        case_anchor="Morris ¶74",
        description=(
            "Community-based restorative or circle-style processes "
            "are available and appropriate for this offence."
        ),
    ),
    SCEFactor(
        key="mandatory_minimum_analysis",
        label="Mandatory minimum constitutional analysis",
        category="sentencing_implications",
        case_anchor="Sharma ¶78",
        description=(
            "Where a mandatory minimum applies, the SCE evidence "
            "engages the constitutional analysis Sharma reaffirms."
        ),
    ),
    SCEFactor(
        key="risk_recalibration_needed",
        label="Risk assessment recalibration needed",
        category="sentencing_implications",
        case_anchor="Morris ¶85",
        description=(
            "Standard actuarial risk instruments may compound rather "
            "than correct for SCE. Recalibration or culturally-informed "
            "interpretation is required for proper weight."
        ),
        suggests_node="N17",
    ),
    SCEFactor(
        key="crown_disclosure_structural",
        label="Crown disclosure on structural data",
        category="sentencing_implications",
        case_anchor="Morris ¶82",
        description=(
            "Crown disclosure obligation extends to internal data on "
            "charging, prosecution, and sentencing patterns where "
            "relevant to SCE."
        ),
    ),
    SCEFactor(
        key="cultural_fit_facility",
        label="Cultural-fit programs at facility",
        category="sentencing_implications",
        case_anchor="Ellis",
        description=(
            "If incarceration is imposed, programs and supports "
            "appropriate to the accused's community must be available."
        ),
    ),
)


# ── Public surface ──────────────────────────────────────────────────────────

FACTORS: tuple[SCEFactor, ...] = _EVIDENCE_TYPES + _SYSTEMIC_PATTERNS + _SENTENCING_IMPLICATIONS
FACTORS_BY_KEY = {f.key: f for f in FACTORS}

CATEGORIES = ("evidence_types", "systemic_patterns", "sentencing_implications")
CATEGORY_LABELS = {
    "evidence_types":          "Evidence types marshalled",
    "systemic_patterns":       "Systemic patterns established",
    "sentencing_implications": "Sentencing implications",
}
CATEGORY_ANCHORS = {
    "evidence_types":          "Morris ¶74, ¶82; Anderson ¶119",
    "systemic_patterns":       "Morris ¶74, ¶85; Anderson ¶119",
    "sentencing_implications": "Morris ¶74; Sharma ¶78",
}


def factors_for_category(category: str) -> tuple[SCEFactor, ...]:
    return tuple(f for f in FACTORS if f.category == category)


# ── Threshold logic for evidence-bridge suggestions ─────────────────────────

def compute_evidence_suggestions(factor_states: dict) -> list[dict]:
    """Given ticked SCE factors, return Bayesian network bridge suggestions.

    factor_states shape: {factor_key: {ticked: bool, text: str}}
    Returns: [{node: 'N14', value: 0.75, rationale: '...'}, ...]
    """
    ticked = {k for k, v in factor_states.items() if v.get("ticked")}

    evidence_count = sum(
        1 for k in ticked
        if FACTORS_BY_KEY.get(k) and FACTORS_BY_KEY[k].category == "evidence_types"
    )
    systemic_count = sum(
        1 for k in ticked
        if FACTORS_BY_KEY.get(k) and FACTORS_BY_KEY[k].category == "systemic_patterns"
    )

    suggestions: list[dict] = []

    # N14 (over-policing) — direct factor OR strong evidential support
    if "over_policing_documented" in ticked or "anti_black_racism" in ticked:
        suggestions.append({
            "node":      "N14",
            "value":     0.75,
            "rationale": (
                "Over-policing or anti-Black racism in record per Morris "
                "¶74 engages N14 (over-policing distortion) at substantive "
                "weight."
            ),
        })
    elif systemic_count >= 3 and evidence_count >= 2:
        suggestions.append({
            "node":      "N14",
            "value":     0.55,
            "rationale": (
                f"{systemic_count} systemic patterns ticked with "
                f"{evidence_count} evidence types marshalled — Morris "
                f"methodological framework engages N14 at moderate weight."
            ),
        })

    # N16 (tariff disparities — derived)
    if "sentencing_disparities" in ticked:
        suggestions.append({
            "node":      "N16",
            "value":     0.70,
            "rationale": (
                "Sentencing disparities established under Morris ¶85 "
                "engages N16 (tariff disparities, derived)."
            ),
        })
    elif systemic_count >= 4:
        suggestions.append({
            "node":      "N16",
            "value":     0.55,
            "rationale": (
                f"{systemic_count} systemic patterns established — "
                "structural disparities downstream of Morris methodology "
                "engage N16 at moderate weight."
            ),
        })

    # N17 (collider bias — derived)
    if "risk_recalibration_needed" in ticked:
        suggestions.append({
            "node":      "N17",
            "value":     0.60,
            "rationale": (
                "Risk-recalibration argued under Morris ¶85 engages N17 "
                "(collider bias) directly."
            ),
        })

    return suggestions


# ── LLM system-prompt helpers ───────────────────────────────────────────────

def describe_all_factors_for_prompt() -> str:
    """Structured factor list the LLM reads when drafting submissions."""
    lines: list[str] = []
    for cat in CATEGORIES:
        lines.append(f"\n## {CATEGORY_LABELS[cat]}  [{CATEGORY_ANCHORS[cat]}]")
        for f in factors_for_category(cat):
            lines.append(f"  - {f.key} ({f.case_anchor}): {f.label}")
            lines.append(f"      {f.description}")
    return "\n".join(lines)


CITATION_MARKER_RULE = """\
When citing case authority in generated text, use INLINE MARKERS in this
exact format, with NO spaces inside the brackets:

    [morris:74]    — Morris, paragraph 74 (methodological framework)
    [morris:82]    — Morris, paragraph 82 (evidential burden)
    [morris:85]    — Morris, paragraph 85 (judicial notice)
    [anderson:119] — Anderson, paragraph 119 (IRCA framework)
    [ellis:N]      — Ellis (applied sentencing case; use a specific
                     paragraph if available, generic 'Ellis' if not)
    [sharma:78]    — Sharma, paragraph 78 (constitutional anchor)

Place markers immediately after the proposition they support, NOT at the
end of sentences. The frontend will render these as pills inline with the
prose. Only cite the six anchor points above; do not invent additional
case citations.
"""
