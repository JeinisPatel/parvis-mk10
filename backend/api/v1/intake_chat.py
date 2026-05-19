"""
POST /api/v1/intake/turn — conduct one turn of a PARVIS-led structured
intake interview.

The interview protocol (six doctrinal phases) is fully deterministic and
lives in parvis_engine/_intake_protocol.py. This endpoint is the bridge
between the protocol and the LLM:

  1. Receive conversation history + new user message + accumulated extracted dict
  2. Compute next-focus directive via the protocol module (no LLM)
  3. Build a system prompt that:
     - states PARVIS's role
     - shows current phase and completeness
     - injects the directive verbatim
     - specifies the JSON output schema
  4. Call the LLM (Anthropic / OpenAI / Gemini) with key from header
  5. Parse JSON, merge new extracted fields, return structured result

Header contract (same as Documents):
  X-Parvis-Api-Provider: 'anthropic' | 'openai' | 'gemini'
  X-Parvis-Api-Key:      <provider's raw API key>

No-key path: returns analyzer_status='no_key' immediately with a graceful
message so the frontend renders the "configure key" banner.
"""

from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from parvis_engine._intake_protocol import (
    compute_completeness,
    next_focus,
    PHASE_BY_KEY,
    llm_output_schema_description,
)

router = APIRouter()


# Frontend → Mk 8-analyzer provider name parity
_PROVIDER_MAP = {
    "anthropic": "claude",
    "openai":    "openai",
    "gemini":    "gemini",
}


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role:    str   # 'user' or 'assistant'
    content: str


class IntakeTurnRequest(BaseModel):
    case_reference:       str
    conversation_history: list[ChatMessage] = []
    user_message:         str
    extracted_so_far:     dict[str, Any] = {}


class IntakeSuggestion(BaseModel):
    field:      str
    value:      Any
    confidence: float
    rationale:  str


class IntakeTurnResponse(BaseModel):
    status:           str   # 'completed' | 'no_key' | 'failed' | 'parse_failed'
    error:            Optional[str] = None
    provider:         Optional[str] = None
    assistant_message: str
    new_extracted:    dict[str, Any] = {}
    suggestions:      list[IntakeSuggestion] = []
    phase:            Optional[str] = None
    phase_label:      Optional[str] = None
    cadence:          Optional[str] = None
    percent_total:    float = 0.0
    is_complete:      bool = False


# ── System prompt builder ────────────────────────────────────────────────────

PARVIS_ROLE = """\
You are PARVIS, a decision-support system for Canadian Dangerous Offender
sentencing review. You are conducting a structured intake interview with
a legal professional reviewing the case — Crown, defence, or judicial.
You are NOT an autonomous decision-maker — you are a tool that surfaces
doctrinal considerations so the user can reach reasoned analytical
judgments appropriate to their role.

Your behaviour:
  - Speak as a careful, doctrinally-literate colleague. Plain modern English.
  - Do not assume the user's role unless they tell you. Use neutral
    terminology ("the offender", "the case") rather than role-specific
    framings ("your client", "the accused"). If the user signals their
    role, mirror their vocabulary respectfully.
  - Do not lecture. Do not over-explain. Acknowledge what the user
    said, then ask the next question.
  - When the user gives you new information, extract structured
    fields and return them in the JSON 'extracted' map.
  - Follow the cadence directive exactly — when it says 'open', ask the
    broad opening question; when it says 'narrowing' or 'targeted', focus
    on the listed remaining fields.
  - Do not invent facts. If something is ambiguous, ask a clarifying
    question instead of guessing.
  - Cite Tetrad nodes by their N-numbers when relevant (N5 Ewert, N7
    Antic, N10 intergenerational trauma, N12 Gladue misapplication, etc.)
    but sparingly — only when it adds clarity.
"""


def build_system_prompt(extracted_so_far: dict[str, Any]) -> str:
    state = compute_completeness(extracted_so_far)
    focus = next_focus(extracted_so_far)

    phase_label = "complete"
    if focus["phase"]:
        phase_label = PHASE_BY_KEY[focus["phase"]].label

    fields_filled_list = []
    for pk, ps in state["phases"].items():
        if ps["fields_filled"]:
            for k in ps["fields_filled"]:
                v = extracted_so_far.get(k)
                fields_filled_list.append(f"  - {k} = {v!r}")
    fields_filled_str = "\n".join(fields_filled_list) if fields_filled_list else "  (none yet)"

    return f"""\
{PARVIS_ROLE}

═══ INTERVIEW STATE ═══

Current phase:     {focus['phase']} — {phase_label}
Cadence:           {focus['cadence']}
Overall progress:  {state['percent_total']}%

Fields already filled across the interview:
{fields_filled_str}

═══ DIRECTIVE FOR THIS TURN ═══

{focus['directive']}

═══ OUTPUT SCHEMA ═══

{llm_output_schema_description()}
"""


# ── LLM call (provider-agnostic) ─────────────────────────────────────────────

def _call_anthropic(
    api_key:        str,
    system_prompt:  str,
    history:        list[ChatMessage],
    user_message:   str,
) -> str:
    try:
        from anthropic import Anthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed")
    client = Anthropic(api_key=api_key)

    messages = [
        {"role": m.role, "content": m.content}
        for m in history if m.role in ("user", "assistant")
    ]
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=system_prompt,
        messages=messages,
    )

    text_chunks = []
    for block in response.content:
        if hasattr(block, "text"):
            text_chunks.append(block.text)
    return "".join(text_chunks).strip()


def _call_openai(
    api_key:        str,
    system_prompt:  str,
    history:        list[ChatMessage],
    user_message:   str,
) -> str:
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package not installed")
    client = OpenAI(api_key=api_key)
    messages = [{"role": "system", "content": system_prompt}]
    for m in history:
        if m.role in ("user", "assistant"):
            messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=2000,
        messages=messages,
    )
    return response.choices[0].message.content.strip()


def _call_gemini(
    api_key:        str,
    system_prompt:  str,
    history:        list[ChatMessage],
    user_message:   str,
) -> str:
    # Stub: Mk 8 supports Gemini but the SDK call differs. For now we
    # return a clear error so the UI can show "Gemini not yet wired".
    raise RuntimeError("Gemini provider not yet wired in intake_chat")


# ── JSON-from-LLM parser ─────────────────────────────────────────────────────

def _extract_json(raw: str) -> Optional[dict]:
    """Pull the first complete JSON object out of the LLM's response.

    LLMs sometimes wrap JSON in ```json fences or prepend a stray sentence
    even when told not to; we strip those defensively.
    """
    s = raw.strip()
    if s.startswith("```"):
        # Strip ``` and optional 'json' marker
        lines = s.split("\n")
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        s = "\n".join(lines).strip()

    # Find first { and matching last }
    start = s.find("{")
    if start < 0:
        return None
    depth = 0
    end = -1
    for i, ch in enumerate(s[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end < 0:
        return None
    try:
        return json.loads(s[start:end + 1])
    except json.JSONDecodeError:
        return None


# ── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/intake/turn", response_model=IntakeTurnResponse)
async def intake_turn(
    body: IntakeTurnRequest,
    x_parvis_api_key:      Optional[str] = Header(default=None),
    x_parvis_api_provider: Optional[str] = Header(default="anthropic"),
) -> IntakeTurnResponse:

    # Compute completeness regardless of LLM availability — frontend uses
    # this for the phase progress strip.
    state = compute_completeness(body.extracted_so_far)
    focus = next_focus(body.extracted_so_far)
    phase_label = (
        PHASE_BY_KEY[focus["phase"]].label if focus["phase"] else "Interview complete"
    )

    # No-key path
    if not x_parvis_api_key:
        return IntakeTurnResponse(
            status="no_key",
            assistant_message=(
                "To begin the intake interview, please configure an LLM API key "
                "in Settings. The interview protocol is ready and will activate "
                "as soon as a key is saved."
            ),
            phase=focus["phase"],
            phase_label=phase_label,
            cadence=focus["cadence"],
            percent_total=state["percent_total"],
            is_complete=state["is_complete"],
        )

    # Build system prompt
    system_prompt = build_system_prompt(body.extracted_so_far)

    # Provider dispatch
    fe_provider = (x_parvis_api_provider or "anthropic").lower()
    try:
        if fe_provider == "anthropic":
            raw = _call_anthropic(
                x_parvis_api_key, system_prompt, body.conversation_history, body.user_message
            )
        elif fe_provider == "openai":
            raw = _call_openai(
                x_parvis_api_key, system_prompt, body.conversation_history, body.user_message
            )
        elif fe_provider == "gemini":
            raw = _call_gemini(
                x_parvis_api_key, system_prompt, body.conversation_history, body.user_message
            )
        else:
            raise RuntimeError(f"Unknown provider: {fe_provider}")
    except Exception as e:
        return IntakeTurnResponse(
            status="failed",
            error=str(e),
            assistant_message="The LLM call failed. See error.",
            phase=focus["phase"],
            phase_label=phase_label,
            cadence=focus["cadence"],
            percent_total=state["percent_total"],
            is_complete=state["is_complete"],
        )

    # Parse the LLM's JSON
    parsed = _extract_json(raw)
    if parsed is None:
        # The LLM returned text but not valid JSON. Surface the raw text
        # as the assistant message so the practitioner still sees something
        # useful, but flag the parse failure.
        return IntakeTurnResponse(
            status="parse_failed",
            error="LLM did not return valid JSON",
            provider=fe_provider,
            assistant_message=raw[:2000],
            phase=focus["phase"],
            phase_label=phase_label,
            cadence=focus["cadence"],
            percent_total=state["percent_total"],
            is_complete=state["is_complete"],
        )

    # Extract fields from the parsed JSON
    assistant_message = str(parsed.get("message", "")).strip()
    new_extracted    = dict(parsed.get("extracted", {}) or {})
    raw_suggestions  = list(parsed.get("suggestions", []) or [])

    suggestions: list[IntakeSuggestion] = []
    for s in raw_suggestions:
        try:
            suggestions.append(IntakeSuggestion(
                field=str(s.get("field", "")),
                value=s.get("value"),
                confidence=float(s.get("confidence", 0) or 0),
                rationale=str(s.get("rationale", "") or "")[:300],
            ))
        except Exception:
            continue  # skip malformed suggestion entries

    # Recompute completeness AFTER merging the new fields, so the frontend
    # sees the updated phase progress.
    merged = {**body.extracted_so_far, **new_extracted}
    new_state = compute_completeness(merged)
    new_focus = next_focus(merged)
    new_phase_label = (
        PHASE_BY_KEY[new_focus["phase"]].label
        if new_focus["phase"] else "Interview complete"
    )

    return IntakeTurnResponse(
        status="completed",
        provider=fe_provider,
        assistant_message=assistant_message or "(no message returned)",
        new_extracted=new_extracted,
        suggestions=suggestions,
        phase=new_focus["phase"],
        phase_label=new_phase_label,
        cadence=new_focus["cadence"],
        percent_total=new_state["percent_total"],
        is_complete=new_state["is_complete"],
    )
