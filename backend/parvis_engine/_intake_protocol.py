"""
Intake interview protocol — the doctrinal scaffolding for PARVIS-led
structured interviews.

The protocol is fully deterministic — no LLM. Its job is to tell the LLM,
on every turn, where the interview *currently is* in terms of doctrinal
completeness, and what should be asked next. The LLM only handles natural
language: extracting fields from the practitioner's prose and generating
the next conversational turn.

Six phases mirror the Tetrad and the screens of the audit:

  identity              → Case profile
  indigenous_gladue     → Gladue factors screen, N10 / N12
  criminal_history      → Criminal record screen, N2 / N7
  psychological_risk    → Risk & distortions, N3 / N4 / N5 / N9 / N18
  procedural_integrity  → N6 / N7 / N8
  systemic_context      → SCE Morris-Ellis, N13 / N14

Fields per phase fall into three classes:
  required:  must be filled before phase considered complete
  optional:  not required, but PARVIS should surface them if mentioned
  conditional: only required if a gate field is true (e.g. nation only
               required if indigenous_identity is true)

The next-question generator is hybrid: when a phase is fresh it asks a
broad open question; when more than half its required fields are filled
it asks targeted follow-ups for the remaining gaps.

This module is a Mk 9 helper (underscore prefix), not a Mk 8 engine file.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


# ── Field definitions ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class FieldSpec:
    key:         str
    label:       str
    required:    bool = True
    gate_key:    Optional[str] = None   # if set, only required when gate_key is truthy
    gate_value:  Any = True             # what gate_key needs to equal
    description: str = ""               # passed to LLM as guidance


@dataclass(frozen=True)
class PhaseSpec:
    key:           str
    label:         str
    purpose:       str                  # passed to LLM as phase intent
    opening_question: str               # the broad opener when phase first activates
    fields:        tuple[FieldSpec, ...]


# ── The six phases ───────────────────────────────────────────────────────────

PHASES: tuple[PhaseSpec, ...] = (
    PhaseSpec(
        key="identity",
        label="Identity & charge",
        purpose=(
            "Establish who the client is and what they are charged with. "
            "Foundation for everything else."
        ),
        opening_question=(
            "Let's start with the basics. Who is the client, and what are "
            "they charged with? Include their age, jurisdiction, and the "
            "section of the Criminal Code if you have it."
        ),
        fields=(
            FieldSpec("name",             "Client name"),
            FieldSpec("age",              "Age"),
            FieldSpec("jurisdiction",     "Province / territory"),
            FieldSpec("proposed_offence", "Proposed or index offence"),
            FieldSpec("offence_section",  "Criminal Code section", required=False,
                      description="e.g. s.268 for aggravated assault"),
        ),
    ),

    PhaseSpec(
        key="indigenous_gladue",
        label="Indigenous identity & Gladue factors",
        purpose=(
            "Determine whether Gladue applies. If yes, surface community, "
            "intergenerational trauma, and residential school exposure. "
            "Maps to N10 (intergenerational trauma) and N12 (Gladue misapplication)."
        ),
        opening_question=(
            "Is the client Indigenous? If so, can you tell me about their "
            "Nation, community, and any intergenerational factors — "
            "residential school exposure in the family, dislocation, "
            "child welfare involvement, addiction patterns?"
        ),
        fields=(
            FieldSpec("indigenous_identity", "Indigenous identity (yes/no)"),
            FieldSpec("nation",              "Nation", gate_key="indigenous_identity",
                      description="Cree, Anishinaabe, Mohawk, Métis, Inuit, etc."),
            FieldSpec("community",           "Community / band / reserve",
                      gate_key="indigenous_identity"),
            FieldSpec("intergenerational_factors", "Intergenerational factors",
                      gate_key="indigenous_identity",
                      description=(
                          "Residential school in family, child welfare, "
                          "dislocation, community trauma, addiction patterns"
                      )),
            FieldSpec("residential_school_exposure", "Residential school exposure",
                      required=False, gate_key="indigenous_identity"),
        ),
    ),

    PhaseSpec(
        key="criminal_history",
        label="Criminal history",
        purpose=(
            "Map the prior record. PARVIS will ask the Criminal record screen "
            "to handle conviction-by-conviction detail; here we want the "
            "shape of the pattern. Maps to N2 (violent history)."
        ),
        opening_question=(
            "Tell me about the client's criminal history. Roughly how many "
            "prior convictions, what kinds of offences, when did they happen, "
            "and is there a pattern — escalating, stable, de-escalating?"
        ),
        fields=(
            FieldSpec("prior_convictions_exist", "Has prior convictions (yes/no)"),
            FieldSpec("prior_conviction_count",  "Approximate count",
                      gate_key="prior_convictions_exist"),
            FieldSpec("pattern_description",     "Pattern description",
                      gate_key="prior_convictions_exist",
                      description="Escalating, stable, de-escalating, desistance"),
            FieldSpec("prior_violence",          "Prior violent offences",
                      gate_key="prior_convictions_exist"),
            FieldSpec("most_recent_offence_year", "Most recent offence year",
                      required=False, gate_key="prior_convictions_exist"),
        ),
    ),

    PhaseSpec(
        key="psychological_risk",
        label="Psychological & risk assessments",
        purpose=(
            "Map known assessments. Critically: capture *whether* tools were "
            "used and what they said, NOT validate them. The Ewert concern "
            "(N5 invalid risk tools) requires us to know what's in the file "
            "so we can challenge inappropriate cross-cultural use."
        ),
        opening_question=(
            "What psychological or risk assessments has the client had? "
            "PCL-R, Static-99R, VRAG, FASD assessments, anything else? "
            "I want to know what was administered, not whether it was valid."
        ),
        fields=(
            FieldSpec("prior_assessments",      "Has prior assessments (yes/no)"),
            FieldSpec("pcl_r_score",            "PCL-R score", required=False,
                      gate_key="prior_assessments"),
            FieldSpec("static_99r_score",       "Static-99R score", required=False,
                      gate_key="prior_assessments"),
            FieldSpec("vrag_score",             "VRAG score", required=False,
                      gate_key="prior_assessments"),
            FieldSpec("fasd_assessed",          "FASD assessed",
                      gate_key="prior_assessments",
                      description="Per Friesen / FASD diagnostic literature"),
            FieldSpec("other_assessments",      "Other assessments", required=False,
                      gate_key="prior_assessments"),
        ),
    ),

    PhaseSpec(
        key="procedural_integrity",
        label="Procedural integrity",
        purpose=(
            "Surface procedural distortions: counsel quality (N6 / G.D.B.), "
            "bail denial (N7 / Antic), King-style impeachment cascades (N8), "
            "plea pressure. These are the procedural Tetrad."
        ),
        opening_question=(
            "Now the procedural side. How was counsel? Was bail denied and "
            "if so on what grounds? Were there any concerns about how pleas "
            "were entered or how prior convictions were used to impeach?"
        ),
        fields=(
            FieldSpec("counsel_quality_concerns", "Counsel quality concerns",
                      description="Inadequate preparation, missed motions, no Gladue submissions"),
            FieldSpec("bail_conduct",             "Bail conduct",
                      description="Granted, denied, denied with reasons, ladder applied"),
            FieldSpec("plea_pressure",            "Plea entered under pressure",
                      required=False),
            FieldSpec("king_impeachment_concern", "Prior convictions used to impeach",
                      required=False),
        ),
    ),

    PhaseSpec(
        key="systemic_context",
        label="Systemic context (Morris / Ellis)",
        purpose=(
            "Capture systemic factors that ground a Morris-Ellis social-context-"
            "evidence (SCE) submission. Over-policing (N14 / Le), community "
            "deprivation, gaming risk (N13)."
        ),
        opening_question=(
            "Finally, the systemic context. Is the client from an "
            "over-policed community? Are there Morris-Ellis grounds — "
            "racial profiling, neighbourhood enforcement disparities, "
            "carceral patterns in the community?"
        ),
        fields=(
            FieldSpec("over_policing_concerns",  "Over-policing concerns",
                      description="Le-style enforcement disparity"),
            FieldSpec("morris_ellis_grounds",    "Morris-Ellis SCE grounds",
                      description="Social-context evidence available"),
            FieldSpec("community_deprivation",   "Community deprivation",
                      required=False),
            FieldSpec("gaming_risk_signals",     "Gaming risk signals", required=False,
                      description="Practitioner-observed risk distortions"),
        ),
    ),
)


PHASE_BY_KEY = {p.key: p for p in PHASES}
PHASE_KEYS_ORDERED = tuple(p.key for p in PHASES)


# ── Completeness computation ─────────────────────────────────────────────────

def _field_is_required(f: FieldSpec, extracted: dict) -> bool:
    """A field is required when its base flag is true AND, if gated, when
    the gate field is truthy."""
    if not f.required:
        return False
    if f.gate_key:
        gate_val = extracted.get(f.gate_key)
        if gate_val != f.gate_value:
            return False
    return True


def _field_is_filled(f: FieldSpec, extracted: dict) -> bool:
    v = extracted.get(f.key)
    if v is None:
        return False
    if isinstance(v, str) and not v.strip():
        return False
    return True


def compute_phase_state(phase: PhaseSpec, extracted: dict) -> dict:
    """Returns {fields_required, fields_filled, fields_remaining, percent}."""
    required = [f for f in phase.fields if _field_is_required(f, extracted)]
    filled   = [f for f in required if _field_is_filled(f, extracted)]
    remaining = [f for f in required if not _field_is_filled(f, extracted)]
    percent  = (len(filled) / len(required) * 100.0) if required else 100.0
    return {
        "fields_required":  [f.key for f in required],
        "fields_filled":    [f.key for f in filled],
        "fields_remaining": [{"key": f.key, "label": f.label, "description": f.description}
                             for f in remaining],
        "percent":          round(percent, 1),
    }


def compute_completeness(extracted: dict) -> dict:
    """Top-level: where is the interview overall?

    Returns:
        {
          phases:        per-phase state,
          current_phase: key of the first phase not yet complete,
          percent_total: weighted overall completeness,
          is_complete:   bool — all required fields across all phases filled,
        }
    """
    phases_state = {p.key: compute_phase_state(p, extracted) for p in PHASES}

    current_phase = None
    for p in PHASES:
        if phases_state[p.key]["percent"] < 100.0:
            current_phase = p.key
            break

    total_required = sum(len(s["fields_required"]) for s in phases_state.values())
    total_filled   = sum(len(s["fields_filled"])   for s in phases_state.values())
    percent_total  = (total_filled / total_required * 100.0) if total_required else 100.0

    return {
        "phases":        phases_state,
        "current_phase": current_phase,
        "percent_total": round(percent_total, 1),
        "is_complete":   current_phase is None,
    }


# ── Next-question generation (hybrid cadence) ────────────────────────────────

def next_focus(extracted: dict) -> dict:
    """Returns what PARVIS should focus on for the next turn.

    Cadence:
      - If the current phase is fresh (0% complete), return its broad
        opening question.
      - If less than half complete, return a slightly narrower prompt
        (the opening question + 'in particular, ...').
      - If at least half complete, return a targeted follow-up listing
        the remaining fields by label.
      - If the entire interview is complete, return a wrap-up prompt.

    The LLM gets this object verbatim in its system prompt and is asked
    to honour the cadence — it may paraphrase but shouldn't change the
    interview direction.
    """
    state = compute_completeness(extracted)

    if state["is_complete"]:
        return {
            "phase":    None,
            "cadence":  "wrap_up",
            "directive": (
                "All doctrinal fields are populated. Thank the practitioner, "
                "summarise the case in 2-3 sentences highlighting the strongest "
                "Tetrad themes, and remind them to review the suggestion cards "
                "before moving to the audit screens."
            ),
            "remaining_fields": [],
        }

    phase_key = state["current_phase"]
    phase = PHASE_BY_KEY[phase_key]
    ps    = state["phases"][phase_key]
    pct   = ps["percent"]

    if pct == 0:
        return {
            "phase":    phase_key,
            "cadence":  "open",
            "directive": phase.opening_question,
            "remaining_fields": ps["fields_remaining"],
        }
    if pct < 50:
        remaining_labels = [f["label"] for f in ps["fields_remaining"]]
        return {
            "phase":    phase_key,
            "cadence":  "narrowing",
            "directive": (
                phase.opening_question + " In particular, I still need: "
                + ", ".join(remaining_labels) + "."
            ),
            "remaining_fields": ps["fields_remaining"],
        }
    # At least half done — targeted follow-up.
    remaining_labels = [f["label"] for f in ps["fields_remaining"]]
    return {
        "phase":    phase_key,
        "cadence":  "targeted",
        "directive": (
            "Ask targeted follow-up questions to fill the remaining fields: "
            + ", ".join(remaining_labels) + ". Be specific and brief."
        ),
        "remaining_fields": ps["fields_remaining"],
    }


# ── Schema for LLM JSON output ───────────────────────────────────────────────

def llm_output_schema_description() -> str:
    """Returned to the LLM as part of the system prompt so it knows what
    JSON shape to produce."""
    return """
You must return a single JSON object with exactly this shape:

{
  "message": "<your conversational response to the practitioner, prose, 1-3 paragraphs>",
  "extracted": {
      "<field_key>": <value>,
      ...
  },
  "suggestions": [
      {
        "field":      "<field_key>",
        "value":      <value>,
        "confidence": <0.0-1.0>,
        "rationale":  "<short reason why you extracted this>"
      },
      ...
  ],
  "next_phase_hint": "<optional: 'transition' if you think the current phase is done>"
}

Rules:
- "message" is what the practitioner will read in the chat thread.
- "extracted" contains *only* fields you are confident about from this turn.
- "suggestions" mirrors extracted but with rationale and confidence — these
  become the cards in the sidebar. One entry per extracted field.
- Return raw JSON only. No markdown fences, no preamble, no commentary outside the JSON.
"""
