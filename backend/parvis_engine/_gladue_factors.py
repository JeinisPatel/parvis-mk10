"""
Gladue factors — structured doctrinal scaffolding for the Gladue submission
screen, anchored in:

    Gladue   — R v Gladue, [1999] 1 SCR 688
    Ipeelee  — R v Ipeelee, 2012 SCC 13
    Sharma   — R v Sharma, 2022 SCC 39
    Morris   — R v Morris, 2021 ONCA 680 (cited for systemic-context method
               that reads across to Gladue-style submissions)

Each factor has:
    key:           machine identifier
    label:         human label (1-6 words)
    category:      'systemic' | 'individual' | 'sentencing'
    case_anchor:   the paragraph that most directly supports it
                   (rendered as the small pill on the screen)
    description:   1-2 sentence doctrinal note shown on hover / on the card
    suggests_node: optional Tetrad node N-id this factor speaks to

The frontend renders these grouped by category. The backend's narrative-
generation system prompt receives the *full* list and is told to only cite
factors actually ticked by the practitioner. Threshold logic for the
"apply to evidence" bridge:

    >=4 systemic factors    → suggest N10 (intergenerational trauma) at 80%
    >=2 individual factors  → reinforces N10
    any sentencing factor   → suggest N12 (Gladue misapplication) consideration

This module is a Mk 9 helper, not a Mk 8 engine file.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class GladueFactor:
    key:           str
    label:         str
    category:      str   # 'systemic' | 'individual' | 'sentencing'
    case_anchor:   str   # e.g. 'Gladue ¶66'
    description:   str
    suggests_node: Optional[str] = None  # e.g. 'N10'


# ── Systemic / background factors (Gladue ¶66; refined by Ipeelee) ───────────
# These are the historical and present circumstances bearing on the
# individual *because* of their Indigenous identity. They speak primarily
# to N10 (intergenerational trauma) and frame the Gladue analysis.

_SYSTEMIC: tuple[GladueFactor, ...] = (
    GladueFactor(
        key="residential_schools",
        label="Residential school exposure",
        category="systemic",
        case_anchor="Gladue ¶66",
        description=(
            "Direct or intergenerational residential school exposure. "
            "Among the most consistently weighty Gladue factors; "
            "Ipeelee ¶60 treats it as systemic."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="child_welfare",
        label="Child welfare involvement",
        category="systemic",
        case_anchor="Ipeelee ¶60",
        description=(
            "Sixties-scoop or current CFS involvement. Recognised as a "
            "systemic factor in Ipeelee's reformulation of the Gladue analysis."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="loss_of_culture",
        label="Loss of culture / language",
        category="systemic",
        case_anchor="Gladue ¶66",
        description=(
            "Disconnection from language, ceremony, kinship structures. "
            "Goes to the systemic-and-background factors prong of Gladue."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="family_addiction",
        label="Family / community addiction patterns",
        category="systemic",
        case_anchor="Ipeelee ¶60",
        description=(
            "Substance use patterns in the family or community of origin. "
            "Often a downstream marker of residential schools / CFS contact."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="community_fragmentation",
        label="Community fragmentation / violence",
        category="systemic",
        case_anchor="Gladue ¶66",
        description=(
            "Violence within the community, fractured kinship and "
            "governance, post-contact disruption."
        ),
    ),
    GladueFactor(
        key="poverty",
        label="Poverty / economic marginalisation",
        category="systemic",
        case_anchor="Gladue ¶66",
        description=(
            "Material poverty as a systemic outcome of dispossession; "
            "consistently named in the Gladue ¶66 enumeration."
        ),
    ),
    GladueFactor(
        key="dislocation",
        label="Dislocation / urbanisation",
        category="systemic",
        case_anchor="Ipeelee ¶60",
        description=(
            "Removal from traditional territory; urbanisation without "
            "cultural continuity. A Gladue/Ipeelee systemic factor."
        ),
    ),
    GladueFactor(
        key="discrimination",
        label="Discrimination experienced",
        category="systemic",
        case_anchor="Morris ¶74",
        description=(
            "Lived experience of racism in encounters with state systems "
            "(school, child welfare, policing, courts). Morris articulates "
            "the methodological framework for putting such evidence before "
            "a sentencing court; Gladue/Ipeelee anchor it for Indigenous "
            "accused."
        ),
        suggests_node="N14",
    ),
    GladueFactor(
        key="education_disruption",
        label="Education disruption",
        category="systemic",
        case_anchor="Gladue ¶66",
        description=(
            "Interrupted or absent formal education; truncated schooling "
            "as a downstream effect of systemic factors."
        ),
    ),
    GladueFactor(
        key="health_service_gaps",
        label="Gaps in health / addictions services",
        category="systemic",
        case_anchor="Ipeelee ¶60",
        description=(
            "Lack of culturally appropriate mental health or addictions "
            "support in the community at the relevant time."
        ),
    ),
)


# ── Individual circumstances (Ipeelee ¶73) ───────────────────────────────────
# How the systemic factors *expressed themselves in this individual's life*.
# Ipeelee is explicit that the analysis must connect systemic to individual.

_INDIVIDUAL: tuple[GladueFactor, ...] = (
    GladueFactor(
        key="personal_trauma",
        label="Personal trauma history",
        category="individual",
        case_anchor="Ipeelee ¶73",
        description=(
            "Direct trauma experience — abuse, witnessing violence, loss. "
            "The individual-level expression of systemic patterns."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="mental_health",
        label="Mental health condition",
        category="individual",
        case_anchor="Ipeelee ¶73",
        description=(
            "Documented or strongly indicated mental health condition; "
            "particularly relevant where treatment access has been "
            "culturally inappropriate."
        ),
    ),
    GladueFactor(
        key="addiction",
        label="Substance use / addiction",
        category="individual",
        case_anchor="Ipeelee ¶73",
        description=(
            "Individual addiction pattern; Ipeelee treats addiction as a "
            "moral-culpability factor where rooted in systemic harm."
        ),
    ),
    GladueFactor(
        key="fasd",
        label="FASD or cognitive impairment",
        category="individual",
        case_anchor="Ipeelee ¶73",
        description=(
            "Fetal Alcohol Spectrum Disorder or other cognitive impairment. "
            "Engages N9 (FASD-as-dual-relevance node) and goes directly to "
            "moral culpability under Ipeelee."
        ),
        suggests_node="N9",
    ),
    GladueFactor(
        key="attachment_disruption",
        label="Attachment / placement disruption",
        category="individual",
        case_anchor="Ipeelee ¶73",
        description=(
            "Multiple placements, broken caregiver relationships, "
            "out-of-community foster care."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="prior_cfs_contact",
        label="Prior CFS contact (self)",
        category="individual",
        case_anchor="Ipeelee ¶73",
        description=(
            "The individual was themselves in care. Distinct from family "
            "CFS involvement; both can be present."
        ),
        suggests_node="N10",
    ),
    GladueFactor(
        key="intergenerational_survivor",
        label="Intergenerational survivor",
        category="individual",
        case_anchor="Ipeelee ¶60",
        description=(
            "Direct lineal descent from residential school survivors; "
            "the inherited trauma frame Ipeelee endorses."
        ),
        suggests_node="N10",
    ),
)


# ── Sentencing considerations (Sharma + Ipeelee + Morris read-across) ────────
# These shape what the sanction should *do*. Sharma reaffirms the Gladue/
# Ipeelee framework's constitutional weight; the practical sentencing-side
# factors below speak to the actual shape of the order.

_SENTENCING: tuple[GladueFactor, ...] = (
    GladueFactor(
        key="restorative_available",
        label="Restorative options available",
        category="sentencing",
        case_anchor="Sharma ¶78",
        description=(
            "Community-based restorative options exist for this client. "
            "Sharma reaffirms restorative sentencing as constitutionally "
            "anchored where Gladue applies."
        ),
        suggests_node="N12",
    ),
    GladueFactor(
        key="healing_lodge_eligibility",
        label="Healing lodge eligibility",
        category="sentencing",
        case_anchor="Ipeelee ¶74",
        description=(
            "Eligibility for a CSC healing lodge or s.81 placement. "
            "Where eligibility exists, a sentence that forecloses access "
            "without analysis is a Gladue misapplication."
        ),
        suggests_node="N12",
    ),
    GladueFactor(
        key="community_supervision",
        label="Community-based supervision capacity",
        category="sentencing",
        case_anchor="Ipeelee ¶74",
        description=(
            "Capacity in the community of origin for culturally relevant "
            "supervision or reintegration support."
        ),
    ),
    GladueFactor(
        key="cultural_continuity",
        label="Cultural continuity at facility",
        category="sentencing",
        case_anchor="Ipeelee ¶74",
        description=(
            "Whether the contemplated facility offers cultural continuity "
            "(elders, ceremony, language)."
        ),
    ),
    GladueFactor(
        key="diminished_culpability",
        label="Diminished moral culpability",
        category="sentencing",
        case_anchor="Ipeelee ¶73",
        description=(
            "Ipeelee's central holding: where systemic and background "
            "factors are causally connected to the offending, the moral "
            "culpability of the accused is diminished."
        ),
        suggests_node="N12",
    ),
    GladueFactor(
        key="structural_factors_documented",
        label="Structural factors in record",
        category="sentencing",
        case_anchor="Sharma ¶78",
        description=(
            "The Gladue/Ipeelee structural analysis is properly documented "
            "in the record before the court. Sharma reinforces this as the "
            "constitutional minimum."
        ),
    ),
    GladueFactor(
        key="distance_from_community",
        label="Distance from community in custody",
        category="sentencing",
        case_anchor="Ipeelee ¶74",
        description=(
            "Physical separation from family/community as a factor "
            "weighing against custodial disposition or for placement "
            "considerations."
        ),
    ),
    GladueFactor(
        key="alternative_to_indeterminate",
        label="Alternative to indeterminate sentence",
        category="sentencing",
        case_anchor="Sharma ¶78",
        description=(
            "Where DO designation is sought, the existence of a credible "
            "Gladue-compliant alternative (LTO + community supervision, "
            "etc.) is constitutionally salient post-Sharma."
        ),
        suggests_node="N12",
    ),
)


# ── Public surface ───────────────────────────────────────────────────────────

FACTORS: tuple[GladueFactor, ...] = _SYSTEMIC + _INDIVIDUAL + _SENTENCING
FACTORS_BY_KEY = {f.key: f for f in FACTORS}

CATEGORIES = ("systemic", "individual", "sentencing")
CATEGORY_LABELS = {
    "systemic":   "Systemic / background factors",
    "individual": "Individual circumstances",
    "sentencing": "Sentencing considerations",
}
CATEGORY_ANCHORS = {
    "systemic":   "Gladue ¶66; refined Ipeelee ¶60",
    "individual": "Ipeelee ¶73",
    "sentencing": "Ipeelee ¶74; Sharma ¶78",
}


def factors_for_category(category: str) -> tuple[GladueFactor, ...]:
    return tuple(f for f in FACTORS if f.category == category)


# ── Threshold logic for evidence-bridge suggestions ──────────────────────────

def compute_evidence_suggestions(factor_states: dict) -> list[dict]:
    """Given the practitioner's ticked factor state, return suggestions
    for evidence-state writes (Risk & distortions).

    factor_states shape: {factor_key: {ticked: bool, text: str}}
    Returns: [{node: 'N10', value: 0.8, rationale: '...'}, ...]
    """
    ticked = {k for k, v in factor_states.items() if v.get("ticked")}

    systemic_count = sum(
        1 for k in ticked if FACTORS_BY_KEY.get(k) and FACTORS_BY_KEY[k].category == "systemic"
    )
    individual_count = sum(
        1 for k in ticked if FACTORS_BY_KEY.get(k) and FACTORS_BY_KEY[k].category == "individual"
    )
    sentencing_count = sum(
        1 for k in ticked if FACTORS_BY_KEY.get(k) and FACTORS_BY_KEY[k].category == "sentencing"
    )

    suggestions: list[dict] = []

    if systemic_count >= 4:
        suggestions.append({
            "node":      "N10",
            "value":     0.80,
            "rationale": (
                f"{systemic_count} systemic Gladue factors ticked. Per "
                f"Ipeelee ¶60, this engages N10 (intergenerational trauma) "
                f"at substantive weight."
            ),
        })
    elif systemic_count >= 2 and individual_count >= 1:
        suggestions.append({
            "node":      "N10",
            "value":     0.55,
            "rationale": (
                f"{systemic_count} systemic + {individual_count} individual "
                f"factors. Ipeelee's individual-systemic link is engaged at "
                f"moderate weight."
            ),
        })

    if "fasd" in ticked:
        suggestions.append({
            "node":      "N9",
            "value":     0.85,
            "rationale": "FASD factor ticked — engages N9 directly.",
        })

    if sentencing_count >= 2:
        suggestions.append({
            "node":      "N12",
            "value":     0.65,
            "rationale": (
                f"{sentencing_count} sentencing-side Gladue factors with "
                f"alternatives identified; failure to weigh them per Sharma "
                f"¶78 risks N12 (Gladue misapplication)."
            ),
        })

    return suggestions


# ── LLM system-prompt helpers ────────────────────────────────────────────────

def describe_all_factors_for_prompt() -> str:
    """Returns a structured summary of every factor that the LLM can read
    when generating per-factor text or the full narrative."""
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

    [gladue:66]     — Gladue, paragraph 66
    [ipeelee:60]    — Ipeelee, paragraph 60
    [ipeelee:73]    — Ipeelee, paragraph 73
    [ipeelee:74]    — Ipeelee, paragraph 74
    [sharma:78]     — Sharma, paragraph 78
    [morris:74]     — Morris, paragraph 74

Place markers immediately after the proposition they support, NOT at the
end of sentences. The frontend will render these as pills inline with the
prose. Only cite the six anchor points above; do not invent case citations.
"""
