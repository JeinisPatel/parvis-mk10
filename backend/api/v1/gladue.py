"""
Gladue endpoints — Mk 9 API surface for the Gladue factors screen.

Two routes:

    POST /api/v1/gladue/suggest_factor_text
        Blocking. Draft 2-4 sentences applying ONE ticked factor to
        the case context (profile + intake extracted state).

    POST /api/v1/gladue/generate_narrative
        Streaming (text/plain). Compose a full ~500-700 word doctrinal
        Gladue submission integrating all ticked factors. Inline citation
        markers per CITATION_MARKER_RULE in
        parvis_engine._gladue_factors.

Both routes read the API key from the X-Parvis-Api-Key header (matching the
Intake chat / Documents pattern) and gracefully degrade when no key is
present.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from parvis_engine._gladue_factors import (
    FACTORS_BY_KEY,
    CATEGORIES,
    CATEGORY_LABELS,
    describe_all_factors_for_prompt,
    CITATION_MARKER_RULE,
)


router = APIRouter(prefix="/api/v1/gladue", tags=["gladue"])


# ── Pydantic request / response shapes ───────────────────────────────────────

class SuggestFactorTextRequest(BaseModel):
    case_reference:   str
    factor_key:       str
    profile:          dict = Field(default_factory=dict)
    intake_extracted: dict = Field(default_factory=dict)
    prior_text:       Optional[str] = None


class SuggestFactorTextResponse(BaseModel):
    status:     str
    text:       str
    factor_key: str
    note:       Optional[str] = None


class GenerateNarrativeRequest(BaseModel):
    case_reference:   str
    profile:          dict = Field(default_factory=dict)
    intake_extracted: dict = Field(default_factory=dict)
    factor_states:    dict = Field(default_factory=dict)


# ── PARVIS role + context formatters ─────────────────────────────────────────

PARVIS_ROLE = """\
You are PARVIS — Probabilistic and Analytical Reasoning Virtual Intelligence
System. You support Canadian criminal-justice practitioners (defence, Crown, judiciary, probation, and academic users) with doctrinally-grounded
Gladue submissions for Dangerous Offender and sentencing reviews.

Your tone is that of an experienced criminal-law practitioner: precise, doctrinally
literate, professionally restrained. You do not editorialise. You do not
invent facts. You apply Gladue, Ipeelee, Sharma, and Morris where they have
been doctrinally placed — never speculatively.

When you reference a fact, it must come from the supplied profile, intake
transcript, or factor narrative. When you reference doctrine, you cite it
using the inline marker protocol.
"""


def _format_profile_block(profile: dict) -> str:
    if not profile:
        return "(no profile data provided)"
    lines: list[str] = []
    fields = [
        ("caseReference",      "Case reference"),
        ("givenName",          "Given name"),
        ("familyName",         "Family name"),
        ("indigenousIdentity", "Indigenous identity"),
        ("nationCommunity",    "Nation / community"),
        ("placeOfOrigin",      "Place of origin"),
        ("fasdDiagnosis",      "FASD diagnosis"),
        ("cognitiveAssess",    "Cognitive assessment completed"),
        ("mentalHealthDx",     "Mental health note"),
        ("primaryCharge",      "Primary charge"),
        ("jurisdiction",       "Jurisdiction"),
        ("s753Application",    "s.753 application status"),
    ]
    for key, label in fields:
        val = profile.get(key)
        if val not in (None, "", False):
            lines.append(f"  {label}: {val}")
    return "\n".join(lines) if lines else "(profile present but empty)"


def _format_intake_block(intake_extracted: dict) -> str:
    if not intake_extracted:
        return "(no intake transcript extracted)"
    lines = [
        f"  {k}: {v}"
        for k, v in intake_extracted.items()
        if v not in (None, "", False)
    ]
    return "\n".join(lines) if lines else "(intake extracted but empty)"


def _format_factor_states_block(factor_states: dict) -> str:
    ticked = [
        (k, v) for k, v in factor_states.items()
        if isinstance(v, dict) and v.get("ticked")
    ]
    if not ticked:
        return "(no factors ticked)"

    lines: list[str] = []
    for cat in CATEGORIES:
        cat_ticked = [
            (k, v) for k, v in ticked
            if FACTORS_BY_KEY.get(k) and FACTORS_BY_KEY[k].category == cat
        ]
        if not cat_ticked:
            continue
        lines.append(f"\n[{CATEGORY_LABELS[cat]}]")
        for key, state in cat_ticked:
            f = FACTORS_BY_KEY[key]
            lines.append(f"  • {f.label} ({f.case_anchor})")
            text = (state.get("text") or "").strip()
            if text:
                lines.append(f"      practitioner note: {text}")
    return "\n".join(lines)


# ── Provider dispatch ────────────────────────────────────────────────────────

def _call_anthropic_blocking(api_key: str, system: str, user: str) -> str:
    try:
        import anthropic
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="anthropic SDK not installed on backend",
        )

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    parts: list[str] = []
    for block in msg.content:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts).strip()


# ── Route: per-factor suggestion (blocking) ──────────────────────────────────

@router.post("/suggest_factor_text", response_model=SuggestFactorTextResponse)
def suggest_factor_text(
    body: SuggestFactorTextRequest,
    x_parvis_api_key:      Optional[str] = Header(default=None, alias="X-Parvis-Api-Key"),
    x_parvis_api_provider: Optional[str] = Header(default="anthropic", alias="X-Parvis-Api-Provider"),
) -> SuggestFactorTextResponse:

    factor = FACTORS_BY_KEY.get(body.factor_key)
    if factor is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown factor key: {body.factor_key}",
        )

    if not x_parvis_api_key:
        return SuggestFactorTextResponse(
            status="no_key",
            text="",
            factor_key=body.factor_key,
            note="No API key set in Settings.",
        )

    provider = (x_parvis_api_provider or "anthropic").lower()
    if provider != "anthropic":
        return SuggestFactorTextResponse(
            status="provider_not_supported",
            text="",
            factor_key=body.factor_key,
            note=f"Provider '{provider}' not yet wired for Gladue draft.",
        )

    system = (
        PARVIS_ROLE + "\n\n"
        + CITATION_MARKER_RULE + "\n\n"
        + "TASK: Draft 2-4 sentences applying ONE specific Gladue factor to "
          "the case described. Use inline citation markers per the rule "
          "above. Anchor doctrinally on the case_anchor of this factor. Do "
          "not invent facts beyond what is in the supplied profile, intake "
          "notes, or prior text. Output ONLY the drafted sentences as plain "
          "prose — no preamble, no headings, no JSON."
    )

    user = f"""\
=== FACTOR ===
key:         {factor.key}
label:       {factor.label}
category:    {factor.category} ({CATEGORY_LABELS[factor.category]})
case_anchor: {factor.case_anchor}
description: {factor.description}

=== PROFILE ===
{_format_profile_block(body.profile)}

=== INTAKE EXTRACTED ===
{_format_intake_block(body.intake_extracted)}

=== PRIOR PRACTITIONER TEXT (if any) ===
{(body.prior_text or '(none)').strip()}

Now draft the 2-4 sentence application of this factor."""

    try:
        text = _call_anthropic_blocking(x_parvis_api_key, system, user)
    except HTTPException:
        raise
    except Exception as exc:
        return SuggestFactorTextResponse(
            status="error",
            text="",
            factor_key=body.factor_key,
            note=f"{type(exc).__name__}: {exc}",
        )

    return SuggestFactorTextResponse(
        status="ok",
        text=text,
        factor_key=body.factor_key,
    )


# ── Route: full narrative (streaming) ────────────────────────────────────────

def _build_narrative_system_prompt() -> str:
    return (
        PARVIS_ROLE + "\n\n"
        + CITATION_MARKER_RULE + "\n\n"
        + """\
TASK: Compose a Gladue submission of approximately 500-700 words, written in
the voice of senior defence counsel addressing the sentencing court.

STRUCTURE (use these section headings exactly, as bare lines):

  [SECTION] Doctrinal frame
      One paragraph setting out the analytical structure — Gladue's systemic /
      individual / sentencing prongs, Ipeelee's binding reformulation, and
      the constitutional anchor reaffirmed in Sharma.

  [SECTION] Systemic and background factors
      One paragraph integrating only the SYSTEMIC factors actually ticked by
      the practitioner. Cite [gladue:66] and [ipeelee:60] where they support
      specific propositions. Reference [morris:74] only where systemic
      discrimination is documented.

  [SECTION] Individual circumstances
      One paragraph integrating only the INDIVIDUAL factors ticked. Cite
      [ipeelee:73] — this is the individual-systemic link.

  [SECTION] Sentencing considerations
      One paragraph integrating only the SENTENCING factors ticked. Cite
      [ipeelee:74] for placement / community considerations and [sharma:78]
      for the constitutional weight of the analysis.

  [SECTION] Submission
      One short closing paragraph specifying the sanction-shape implied by
      the analysis (e.g. LTO over DO, community-based options, culturally
      relevant placement).

CONSTRAINTS:
- Cite ONLY factors ticked by the practitioner. Do not invent additional
  factors. Do not invent biographical facts not in the profile/intake.
- Use citation markers inline, immediately after the proposition they
  support. Do not group citations at the end of paragraphs.
- Write in plain professional prose. No bullet points. No headings other
  than the [SECTION] markers above.
- Where a factor has a practitioner note attached, integrate that note as
  specific evidence of the factor's application to this client.
- Where the profile lacks information, do not speculate — frame the
  submission around what IS documented.
"""
    )


def _build_narrative_user_prompt(body: GenerateNarrativeRequest) -> str:
    return f"""\
=== CASE REFERENCE ===
{body.case_reference}

=== PROFILE ===
{_format_profile_block(body.profile)}

=== INTAKE EXTRACTED ===
{_format_intake_block(body.intake_extracted)}

=== TICKED GLADUE FACTORS (with practitioner notes) ===
{_format_factor_states_block(body.factor_states)}

Now compose the Gladue submission per the structure above."""


@router.post("/generate_narrative")
def generate_narrative(
    body: GenerateNarrativeRequest,
    x_parvis_api_key:      Optional[str] = Header(default=None, alias="X-Parvis-Api-Key"),
    x_parvis_api_provider: Optional[str] = Header(default="anthropic", alias="X-Parvis-Api-Provider"),
):
    ticked_count = sum(
        1 for v in body.factor_states.values()
        if isinstance(v, dict) and v.get("ticked")
    )
    if ticked_count == 0:
        def _no_factors_stream():
            yield (
                "[SECTION] Doctrinal frame\n"
                "No Gladue factors have been ticked. Please tick at least "
                "one factor to generate a submission.\n"
            )
        return StreamingResponse(_no_factors_stream(), media_type="text/plain")

    if not x_parvis_api_key:
        def _no_key_stream():
            yield (
                "[SECTION] Doctrinal frame\n"
                "No API key set. Open Settings and save a provider key to "
                "generate a Gladue submission.\n"
            )
        return StreamingResponse(_no_key_stream(), media_type="text/plain")

    provider = (x_parvis_api_provider or "anthropic").lower()
    if provider != "anthropic":
        def _bad_provider_stream():
            yield (
                f"[SECTION] Doctrinal frame\n"
                f"Provider '{provider}' is not yet wired for Gladue "
                f"narrative streaming. Use the Anthropic provider.\n"
            )
        return StreamingResponse(_bad_provider_stream(), media_type="text/plain")

    system = _build_narrative_system_prompt()
    user   = _build_narrative_user_prompt(body)

    def _anthropic_stream():
        try:
            import anthropic
        except ImportError:
            yield "[ERROR] anthropic SDK not installed on backend\n"
            return

        try:
            client = anthropic.Anthropic(api_key=x_parvis_api_key)
            with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1400,
                system=system,
                messages=[{"role": "user", "content": user}],
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as exc:
            yield f"\n\n[ERROR] {type(exc).__name__}: {exc}\n"

    return StreamingResponse(_anthropic_stream(), media_type="text/plain")
