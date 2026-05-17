"""
PARVIS — Document Analyzer
LLM-powered analysis of legal documents to inform Bayesian node weights.

This module uses the Anthropic API to analyze uploaded documents (Gladue reports,
IRCA reports, psychometric assessments, prior decisions, transcripts, bail records,
trauma assessments) and extracts structured evidence relevant to the 19 child nodes.

The LLM is prompted with the full Tetrad doctrinal framework as context, and returns
structured probability adjustments for each relevant node with doctrinal citations.

Architecture per Item 7:
1. User uploads document (PDF, DOCX, TXT)
2. Text is extracted and sent to Claude with Tetrad system prompt
3. Claude returns JSON: {node_id: {delta, confidence, citations, reasoning}}
4. User reviews and accepts/modifies suggested adjustments
5. Accepted adjustments feed into the Bayesian network as evidence

Important: The LLM provides guidance only. The user (judge, counsel, researcher)
makes the final determination on weight to be assigned.

─────────────────────────────────────────────────────────────────────────────────
PATH A CHANGE LOG — April 2026
─────────────────────────────────────────────────────────────────────────────────
Five targeted edits; no public API changes; app.py integration unaffected.

  [1] _build_system_prompt() fallback wired up correctly.
      Previously: if `from doctrine import build_doctrinal_prompt` failed,
      the analyzer returned a literal "(Doctrine module not available…)"
      string as its doctrinal section, silently stripping the LLM of its
      Tetrad anchor. _SYSTEM_PROMPT_FALLBACK was defined but never reachable.
      Now: broadened to except Exception (catches partial imports, syntax
      errors, etc.) and uses _SYSTEM_PROMPT_FALLBACK, which retains the
      Tetrad content.

  [2] Removed duplicate _get_api_key().
      _resolve_key() (provider-aware) is the canonical resolver. The old
      Anthropic-only _get_api_key() was shadowed and never called from the
      analyze path.

  [3] ANALYZER_NODE_IDS made the single point of coordination between
      NODE_DESCRIPTIONS, the JSON schema, and the downstream consumers in
      model.py / doctrine.py. NODE_DESCRIPTIONS values remain verbatim —
      the carefully-written doctrinal anchors ("Ewert v Canada [2018]",
      "Larsen 2024", etc.) are preserved to avoid silent prompt drift.
      A _verify_node_coverage() helper runs on import and logs a warning
      if ANALYZER_NODE_IDS diverges from NODE_META (model.py) or
      NODE_DOCTRINE (doctrine.py).

  [4] JSON schema skeleton in the analysis prompt is generated from
      ANALYZER_NODE_IDS rather than hardcoded. ANALYSIS_PROMPT_TEMPLATE
      is replaced by _build_analysis_prompt() for the same reason —
      a single call-time construction keeps the prompt and the
      analyzer-covered node set in lockstep.

  [5] _validate_analysis() added. Coerces delta/confidence to bounded
      floats, drops malformed node entries, and ensures top-level fields
      are the types app.py expects. Prevents the tab from crashing if a
      provider returns a string where a float is expected.

No changes to: extract_text_from_upload(), _infer_doc_type(),
_resolve_key(), _call_claude/_openai/_gemini(), _parse_json_response(),
format_analysis_for_display(), model pin, char cap, or cache behaviour.

─────────────────────────────────────────────────────────────────────────────────
PATH B CHANGE — April 2026
─────────────────────────────────────────────────────────────────────────────────
Extended ANALYZER_NODE_IDS from 14 → 17 nodes. Added entries for
nodes 16 (interjurisdictional tariff effects), 17 (collider bias),
and 19 (absence of rehabilitative progress). These were already
documented in doctrine.NODE_DOCTRINE and present in model.NODE_META;
the analyzer was simply ignoring them. All three have ev=False in
NODE_META (no evidence slider in UI), but LLM-inferred deltas flow
through app.py line 271 regardless of the ev flag, so the adjustments
reach the Bayesian network correctly. Nodes 16 and 17 appear directly
in the compute_do_risk distortion sum; node 19 shifts only its own
posterior and doesn't affect DO risk directly.
─────────────────────────────────────────────────────────────────────────────────
STARE DECISIS CHANGE — April 2026
─────────────────────────────────────────────────────────────────────────────────
Added a stare decisis layer computing the binding force of each authority
relative to the document under analysis. New optional arguments to
analyze_document(): doc_jurisdiction and doc_level. When not supplied, the
system auto-detects using stare_decisis.infer_document_jurisdiction().
The system prompt gains a classification block listing every authority
grouped by binding force (binding / strongly_persuasive / persuasive /
not_applicable / under_review). The result gains a top-level
'stare_decisis' field reporting the inferred jurisdiction, detection
confidence, and any inter-provincial Court-of-Appeal splits detected
across the LLM's cited authorities. Fully backward-compatible: callers
that don't pass doc_jurisdiction get auto-detection; callers that don't
read result['stare_decisis'] see no change.
─────────────────────────────────────────────────────────────────────────────────
"""

import json
import logging
import re
from typing import Dict, List, Optional, Tuple, Set
import anthropic

log = logging.getLogger(__name__)

# ── Provider configuration ────────────────────────────────────────────────────
SUPPORTED_PROVIDERS = {
    "claude":  {"label": "Claude (Anthropic) — recommended",  "secret_key": "ANTHROPIC_API_KEY"},
    "openai":  {"label": "GPT-4o (OpenAI)",                   "secret_key": "OPENAI_API_KEY"},
    "gemini":  {"label": "Gemini 1.5 Pro (Google)",           "secret_key": "GOOGLE_API_KEY"},
}

def _resolve_key(provider: str, api_key=None) -> str | None:
    """Resolve API key for the given provider from secrets, env, or argument."""
    if api_key:
        return api_key
    secret_name = SUPPORTED_PROVIDERS.get(provider, {}).get("secret_key", "ANTHROPIC_API_KEY")
    try:
        import streamlit as st
        if hasattr(st, "secrets") and secret_name in st.secrets:
            return st.secrets[secret_name]
    except Exception:
        pass
    import os
    return os.environ.get(secret_name)


def _call_claude(prompt: str, system: str, api_key: str) -> str:
    """Call Anthropic Claude API. Returns raw text response."""
    client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2500,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()


def _call_openai(prompt: str, system: str, api_key: str) -> str:
    """Call OpenAI GPT-4o API. Returns raw text response."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("openai package not installed. Add 'openai' to requirements.txt.")
    client = OpenAI(api_key=api_key)
    resp = client.chat.completions.create(
        model="gpt-4o",
        max_tokens=2500,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        response_format={"type": "json_object"},  # enforces JSON output
    )
    return resp.choices[0].message.content.strip()


def _call_gemini(prompt: str, system: str, api_key: str) -> str:
    """Call Google Gemini 1.5 Pro API. Returns raw text response."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError("google-generativeai package not installed. Add it to requirements.txt.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        system_instruction=system,
        generation_config={"response_mime_type": "application/json", "max_output_tokens": 2500},
    )
    resp = model.generate_content(prompt)
    return resp.text.strip()


def _parse_json_response(raw: str) -> dict:
    """Parse JSON from LLM response — strips markdown fences, handles variations."""
    # Remove markdown fences
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    raw = raw.strip()
    # If response is wrapped in prose, extract the JSON object
    if not raw.startswith('{'):
        start = raw.find('{')
        end   = raw.rfind('}')
        if start != -1 and end != -1:
            raw = raw[start:end+1]
    return json.loads(raw)


# ── Analyzer node coverage — single point of coordination ────────────────────
# These are the nodes the analyzer surfaces evidence for. ANALYZER_NODE_IDS is
# the authoritative set; NODE_DESCRIPTIONS keys must equal it; the JSON schema
# below is generated from it; downstream sync with model.NODE_META and
# doctrine.NODE_DOCTRINE is verified on import (logs a warning on drift).
#
# To extend coverage (e.g. add nodes 16/17/19), add the ID here AND add a
# description to NODE_DESCRIPTIONS. The prompt skeleton will adapt automatically.

ANALYZER_NODE_IDS: Set[int] = {2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15,
                               16, 17, 18, 19}

NODE_DESCRIPTIONS = {
    2:  "Serious violence / violent history — primary aggravating factor for DO designation",
    3:  "Psychopathy (PCL-R) — adversarial allegiance effects documented (Larsen 2024); cultural validity concerns (Ewert)",
    4:  "Sexual offence profile / Static-99R — cultural validity concerns for Indigenous offenders (Ewert v Canada [2018])",
    5:  "Culturally invalid risk tools — Static-99R, VRAG, LSI-R applied without cultural qualification",
    6:  "Ineffective assistance of counsel — failure to investigate Gladue/SCE factors",
    7:  "Bail-denial → wrongful guilty plea cascade — pre-trial detention creates coercive plea incentives",
    9:  "FASD — dual factor: mitigation reducing moral blameworthiness + treatment responsivity modulator",
    10: "Intergenerational trauma — residential school legacy, forced displacement, cultural genocide (Gladue/Ipeelee)",
    11: "Absence of culturally grounded treatment — systemic failure, not offender characteristic (Natomagan 2022 ABCA 48)",
    12: "Judicial misapplication of Gladue tetrad — failure to apply Gladue, Morris, Ellis, or Ewert",
    13: "Gaming risk detector — anomalously positive rehabilitation signals inconsistent with institutional record",
    14: "Over-policing / epistemic contamination — record inflated by disproportionate surveillance",
    15: "Temporal distortion — age-related burnout effect; prior convictions under repudiated mandatory minimums",
    16: "Interjurisdictional tariff effects — provincial variance in sentencing norms produces DO designation disparity independent of offender risk (Lacasse [2015] SCC 64)",
    17: "Collider bias — conditioning on incarceration (caused by both conduct and systemic factors) induces spurious correlations that inflate apparent risk (Pearl 2009)",
    18: "Dynamic risk factors — substance use, antisocial peers, housing instability (assess against structural context)",
    19: "Absence of rehabilitative progress — must be assessed against programming availability; structural absence ≠ offender refusal (Natomagan 2022 ABCA 48)",
}


def _verify_node_coverage() -> None:
    """Soft-check that ANALYZER_NODE_IDS, NODE_DESCRIPTIONS, and the canonical
    sources (model.NODE_META, doctrine.NODE_DOCTRINE) are in sync. Logs
    warnings on drift but never raises — the analyzer must stay operational
    even if one of the upstream modules fails to import.
    """
    # Internal consistency: descriptions must match the declared ID set
    desc_keys = set(NODE_DESCRIPTIONS.keys())
    if desc_keys != ANALYZER_NODE_IDS:
        missing = ANALYZER_NODE_IDS - desc_keys
        extra = desc_keys - ANALYZER_NODE_IDS
        if missing:
            log.warning("NODE_DESCRIPTIONS missing entries for: %s", sorted(missing))
        if extra:
            log.warning("NODE_DESCRIPTIONS has entries not in ANALYZER_NODE_IDS: %s", sorted(extra))

    # Cross-check with model.NODE_META (which nodes accept evidence)
    try:
        from model import NODE_META
        meta_ev_ids = {nid for nid, meta in NODE_META.items() if meta.get("ev")}
        orphaned = ANALYZER_NODE_IDS - set(NODE_META.keys())
        if orphaned:
            log.warning("ANALYZER_NODE_IDS contains nodes absent from NODE_META: %s", sorted(orphaned))
        # Nodes that NODE_META marks as evidence-accepting but the analyzer ignores
        # are Path B territory, not a bug — report at INFO only.
        uncovered = meta_ev_ids - ANALYZER_NODE_IDS
        if uncovered:
            log.info("NODE_META evidence-accepting nodes not covered by analyzer "
                     "(Path B candidates): %s", sorted(uncovered))
    except Exception as e:
        log.info("Could not cross-check against model.NODE_META: %s", e)

    # Cross-check with doctrine.NODE_DOCTRINE
    try:
        from doctrine import NODE_DOCTRINE
        undocumented = ANALYZER_NODE_IDS - set(NODE_DOCTRINE.keys())
        if undocumented:
            log.warning("ANALYZER_NODE_IDS contains nodes absent from NODE_DOCTRINE: %s",
                        sorted(undocumented))
    except Exception as e:
        log.info("Could not cross-check against doctrine.NODE_DOCTRINE: %s", e)


# Run the check on import (silent in the normal case)
_verify_node_coverage()


def _build_system_prompt(
    doc_jurisdiction: Optional[str] = None,
    doc_level: Optional[str] = None,
) -> str:
    """Build system prompt dynamically from doctrine.py — updates automatically.

    If doctrine.py fails to import for any reason (missing file, partial
    import, syntax error), fall back to _SYSTEM_PROMPT_FALLBACK which retains
    the core Tetrad content. The previous implementation returned a placeholder
    string in that path, which silently stripped the LLM of doctrinal context.

    When doc_jurisdiction and doc_level are provided (or auto-detected), a
    stare decisis section is inserted that classifies every known authority
    by its binding force relative to the document. The LLM is instructed to
    respect this classification rather than reason about hierarchy itself.
    """
    try:
        from doctrine import build_doctrinal_prompt
        doctrinal_section = build_doctrinal_prompt()
    except Exception as e:
        log.warning("doctrine.py unavailable (%s) — using static Tetrad fallback.", e)
        return _SYSTEM_PROMPT_FALLBACK

    stare_section = _build_stare_decisis_section(doc_jurisdiction, doc_level)

    return f"""You are PARVIS, a Bayesian sentencing analysis system developed for PhD research
by Jeinis Patel, PhD Candidate and Barrister, University of London (QMUL & LSE).

{doctrinal_section}

{stare_section}

Your task: analyse the provided document and identify evidence relevant to each PARVIS node.
For each relevant node return:
  delta: probability adjustment (-0.30 to +0.30)
  confidence: 0.0 to 1.0
  citations: specific passages from document
  reasoning: doctrinal reasoning with binding authority
  direction: "increases_risk" | "reduces_risk" | "distortion_present" | "distortion_absent"

CRITICAL: You are providing guidance to assist the user — NOT making a determination.
Flag Ewert non-compliance, Gladue/Morris misapplication, and collider bias where present.
When you cite an authority in your reasoning, respect the binding force classification
provided above — do not treat a strongly persuasive authority as binding.
Return ONLY valid JSON. No preamble."""


def _build_stare_decisis_section(
    doc_jurisdiction: Optional[str],
    doc_level: Optional[str],
) -> str:
    """Build the stare decisis authority-classification block for the prompt.

    If stare_decisis.py is unavailable or the document jurisdiction is
    undetermined, returns a short note rather than failing.
    """
    try:
        from stare_decisis import (
            classify_authorities_for_prompt, BindingForce,
        )
    except Exception as e:
        log.info("stare_decisis.py unavailable (%s) — no binding-force layer.", e)
        return "STARE DECISIS LAYER: unavailable (stare_decisis.py not loaded)."

    doc_desc = _format_doc_descriptor(doc_jurisdiction, doc_level)
    header = f"""STARE DECISIS — BINDING FORCE RELATIVE TO THIS DOCUMENT
═══════════════════════════════════════════════════════════════════
Document under analysis: {doc_desc}

The authorities below are classified by their binding force RELATIVE TO
THIS DOCUMENT under Canadian stare decisis rules:

  BINDING              — must be followed on the rule it stands for
  STRONGLY_PERSUASIVE  — another province's CA; not binding, but carries
                         significant weight
  PERSUASIVE           — informative only; no doctrinal compulsion
  NOT_APPLICABLE       — authority has been overruled
  UNDER_REVIEW         — under appeal to the SCC; currently good law but
                         may change

Do not relitigate these classifications. They are computed deterministically
from court-level and jurisdiction metadata. Your job is to determine whether
the RULE a given authority stands for actually applies to the facts of this
document."""

    try:
        classifications = classify_authorities_for_prompt(doc_jurisdiction, doc_level)
    except Exception as e:
        log.warning("classify_authorities_for_prompt failed: %s", e)
        return header + "\n\n(Authority classification unavailable for this run.)"

    # Group by binding force for readable presentation
    groups: Dict[str, List[dict]] = {}
    for entry in classifications:
        groups.setdefault(entry["binding_force"], []).append(entry)

    order = [BindingForce.BINDING, BindingForce.STRONGLY_PERSUASIVE,
             BindingForce.PERSUASIVE, BindingForce.UNDER_REVIEW,
             BindingForce.NOT_APPLICABLE, BindingForce.UNKNOWN]

    lines = [header, ""]
    for force in order:
        entries = groups.get(force, [])
        if not entries:
            continue
        lines.append(f"── {force.upper()} ──")
        # Sort within group for stable output
        for e in sorted(entries, key=lambda x: x["citation"]):
            lines.append(f"  • {e['citation']}  "
                         f"[{e['court_level']}/{e.get('jurisdiction','none')}"
                         f"/{e.get('status','unknown')}]")
        lines.append("")

    lines.append("═══════════════════════════════════════════════════════════════════")
    return "\n".join(lines)


def _format_doc_descriptor(doc_jur: Optional[str], doc_lvl: Optional[str]) -> str:
    """Human-readable descriptor for the document, for insertion in the prompt."""
    if not doc_jur or doc_jur == "unknown":
        return ("jurisdiction UNDETERMINED — binding force cannot be computed "
                "with certainty; authorities will be reported as strongly "
                "persuasive at best")
    jur_names = {
        "federal": "federal (Canada)", "on": "Ontario", "bc": "British Columbia",
        "ab": "Alberta", "qc": "Quebec", "sk": "Saskatchewan",
        "mb": "Manitoba", "ns": "Nova Scotia", "nb": "New Brunswick",
        "nl": "Newfoundland and Labrador", "pe": "Prince Edward Island",
        "yt": "Yukon", "nt": "Northwest Territories", "nu": "Nunavut",
    }
    lvl_names = {
        "ca": "Court of Appeal", "sc": "superior trial court",
        "pc": "provincial/inferior court",
    }
    jn = jur_names.get(doc_jur, doc_jur)
    if doc_lvl and doc_lvl in lvl_names:
        return f"{jn} — {lvl_names[doc_lvl]}"
    return f"{jn} — court level undetermined"


# Used when doctrine.py is unavailable. Retains the core Tetrad anchor so the
# LLM is never prompted without doctrinal context.
_SYSTEM_PROMPT_FALLBACK = """You are a legal AI expert analyzing documents for the PARVIS Bayesian Sentencing Network.
PARVIS operationalises the Canadian sentencing Tetrad:
- R v Gladue [1999] 1 SCR 688: mandatory consideration of systemic/background factors for Indigenous offenders
- R v Ipeelee [2012] SCC 13: reaffirms Gladue; applies to all sentencing contexts
- R v Morris 2021 ONCA 680: SCE for Black/racialized offenders; para 97 connection gate (discernible nexus, not causation)
- R v Ellis 2022 BCCA 278: extends contextual reasoning to non-racialized socially disadvantaged offenders
- Ewert v Canada [2018] SCC 30: culturally invalid actuarial tools must not be applied without qualification
- R v Boutilier 2017 SCC 64: Gladue applies at all stages of DO proceedings including treatability
- R v Natomagan 2022 ABCA 48: absence of culturally appropriate programming cannot be weighed against accused

Your task: analyze the provided document and identify evidence relevant to each of the PARVIS network nodes.

For each relevant node, return:
1. delta: probability adjustment (positive = increases node's High probability, negative = decreases it)
   Range: -0.30 to +0.30 (moderate adjustments; the user makes final determination)
2. confidence: your confidence in this adjustment (0.0 to 1.0)
3. citations: specific passages or facts from the document supporting the adjustment
4. reasoning: doctrinal reasoning linking the document evidence to the node and binding authority
5. direction: "increases_risk" or "reduces_risk" or "distortion_present" or "distortion_absent"

CRITICAL INSTRUCTIONS:
- You are providing guidance to assist the user's assessment, NOT making a determination
- Flag where document evidence conflicts with actuarial scores (Ewert principle)
- Note where Gladue factors are present but were not engaged by prior decision-makers
- Identify Morris para 97 connection strength where applicable
- Flag FASD indicators even where undiagnosed (dual factor — mitigation AND risk modulation)
- Note temporal factors: when prior convictions were imposed and under what legal regime
- Be conservative: only flag nodes where the document contains clear, relevant evidence

Return ONLY valid JSON. No preamble, no explanation outside JSON."""


def _build_analysis_prompt(doc_type: str, content: str) -> str:
    """Construct the per-call analysis prompt.

    Replaces the previous module-level ANALYSIS_PROMPT_TEMPLATE — building
    inline lets the JSON schema skeleton and the node-description block
    derive from ANALYZER_NODE_IDS / NODE_DESCRIPTIONS so they never drift.
    """
    node_desc_text = "\n".join(
        f"  Node {nid}: {NODE_DESCRIPTIONS[nid]}"
        for nid in sorted(ANALYZER_NODE_IDS)
        if nid in NODE_DESCRIPTIONS
    )
    node_schema = ",\n".join(
        f'    "{nid}":  {{"delta": 0.0, "confidence": 0.0, '
        f'"citations": [], "reasoning": "", "direction": ""}}'
        for nid in sorted(ANALYZER_NODE_IDS)
    )
    return f"""Document type: {doc_type}
Document content:
---
{content}
---

Analyze this document and return a JSON object in this exact format:
{{
  "document_summary": "2-3 sentence summary of document type and key findings",
  "applicable_framework": "gladue" | "morris" | "ellis" | "all" | "none",
  "connection_assessment": "absent" | "weak" | "moderate" | "strong" | "direct",
  "nodes": {{
{node_schema}
  }},
  "doctrinal_flags": [],
  "ewert_concern": false,
  "gladue_factors_present_but_unengaged": [],
  "morris_connection_note": ""
}}

Node descriptions for reference:
{node_desc_text}

Set delta=0.0 and confidence=0.0 for nodes where the document contains no relevant evidence.
Only assign non-zero deltas where the document contains clear, specific evidence."""


def extract_text_from_upload(uploaded_file) -> Tuple[str, str]:
    """
    Extract text from uploaded file.
    Returns (text_content, doc_type)
    """
    import io
    filename = uploaded_file.name.lower()
    doc_type = "Unknown document"

    if filename.endswith('.txt'):
        content = uploaded_file.read().decode('utf-8', errors='ignore')
        doc_type = _infer_doc_type(content, filename)

    elif filename.endswith('.pdf'):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(uploaded_file.read()))
            content = '\n'.join(page.extract_text() or '' for page in reader.pages)
            doc_type = _infer_doc_type(content, filename)
        except ImportError:
            content = "[PDF extraction requires pypdf — text preview unavailable]"
            doc_type = "PDF document"

    elif filename.endswith('.docx'):
        try:
            import docx
            doc = docx.Document(io.BytesIO(uploaded_file.read()))
            content = '\n'.join(para.text for para in doc.paragraphs)
            doc_type = _infer_doc_type(content, filename)
        except ImportError:
            content = "[DOCX extraction requires python-docx — text preview unavailable]"
            doc_type = "Word document"

    else:
        content = uploaded_file.read().decode('utf-8', errors='ignore')
        doc_type = _infer_doc_type(content, filename)

    return content[:15000], doc_type  # Limit to ~15k chars for API context


def _infer_doc_type(content: str, filename: str) -> str:
    """Infer document type from content and filename."""
    content_lower = content.lower()
    filename_lower = filename.lower()

    if any(k in content_lower for k in ['gladue', 'gladue report', 'indigenous background']):
        return "Gladue report"
    elif any(k in content_lower for k in ['irca', 'impact of race', 'anti-black', 'systemic racism']):
        return "IRCA (Impact of Race and Culture Assessment)"
    elif any(k in content_lower for k in ['pcl-r', 'psychopathy checklist', 'hare']):
        return "Psychometric assessment (PCL-R)"
    elif any(k in content_lower for k in ['static-99', 'static99', 'sexual recidivism']):
        return "Psychometric assessment (Static-99R)"
    elif any(k in content_lower for k in ['fetal alcohol', 'fasd', 'fas ', 'alcohol spectrum']):
        return "FASD assessment / diagnosis"
    elif any(k in content_lower for k in ['bail hearing', 'release order', 'detention order', 'show cause']):
        return "Bail hearing record"
    elif any(k in content_lower for k in ['ineffective assistance', 'solicitor-client', 'legal aid']):
        return "Ineffective assistance of counsel record"
    elif any(k in content_lower for k in ['transcript', 'examination', 'cross-examination', 'testimony']):
        return "Court transcript"
    elif any(k in content_lower for k in ['sentencing', 'sentence', 'conviction', 'crown']):
        return "Prior sentencing decision"
    elif any(k in content_lower for k in ['trauma', 'residential school', 'abuse', 'neglect']):
        return "Trauma / background assessment"
    else:
        return "Legal document"


# ── Output validation ─────────────────────────────────────────────────────────
# LLM output is text. Even with response_format={"type":"json_object"} or
# response_mime_type="application/json", providers have been known to return
# strings where floats were expected, omit required fields, or nest data
# unexpectedly. Validation here coerces what we can, drops what we can't, and
# guarantees app.py never hits a .get("delta") on a malformed entry.

_VALID_DIRECTIONS = {"", "increases_risk", "reduces_risk",
                     "distortion_present", "distortion_absent"}
_VALID_FRAMEWORKS = {"gladue", "morris", "ellis", "all", "none"}
_VALID_CONNECTIONS = {"absent", "weak", "moderate", "strong", "direct",
                      "not assessed"}


def _coerce_bounded_float(value, lo: float, hi: float) -> Optional[float]:
    """Return float clipped to [lo, hi], or None if not coercible."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if f != f:  # NaN check
        return None
    return max(lo, min(hi, f))


def _validate_analysis(raw: dict) -> dict:
    """Coerce LLM output into the shape app.py expects. Never raises.

    Contract with app.py (see app.py lines 740–756):
      - result["_provider"] preserved if present (set by caller)
      - result["applicable_framework"] is str
      - result["connection_assessment"] is str
      - result["document_summary"] is str
      - result["nodes"] is dict[str, dict] with delta (float) and
        confidence (float) always numeric
      - result["doctrinal_flags"] is list[str]
      - result["ewert_concern"] is bool
    """
    if not isinstance(raw, dict):
        return {
            "document_summary": "Analysis returned non-dict payload — discarded.",
            "applicable_framework": "none",
            "connection_assessment": "not assessed",
            "nodes": {},
            "doctrinal_flags": [],
            "ewert_concern": False,
            "gladue_factors_present_but_unengaged": [],
            "morris_connection_note": "",
        }

    framework = str(raw.get("applicable_framework", "none")).lower().strip()
    if framework not in _VALID_FRAMEWORKS:
        framework = "none"

    connection = str(raw.get("connection_assessment", "not assessed")).lower().strip()
    if connection not in _VALID_CONNECTIONS:
        connection = "not assessed"

    out = {
        "document_summary":    str(raw.get("document_summary", "")),
        "applicable_framework": framework,
        "connection_assessment": connection,
        "doctrinal_flags":     [str(f) for f in (raw.get("doctrinal_flags") or []) if f],
        "ewert_concern":       bool(raw.get("ewert_concern", False)),
        "gladue_factors_present_but_unengaged": [
            str(f) for f in (raw.get("gladue_factors_present_but_unengaged") or []) if f
        ],
        "morris_connection_note": str(raw.get("morris_connection_note", "")),
        "nodes": {},
    }

    nodes_in = raw.get("nodes")
    if not isinstance(nodes_in, dict):
        return out

    dropped = []
    for key, entry in nodes_in.items():
        if not isinstance(entry, dict):
            dropped.append(key)
            continue

        delta = _coerce_bounded_float(entry.get("delta", 0), -0.30, 0.30)
        confidence = _coerce_bounded_float(entry.get("confidence", 0), 0.0, 1.0)
        if delta is None or confidence is None:
            dropped.append(key)
            continue

        citations = entry.get("citations") or []
        if not isinstance(citations, list):
            citations = [citations]
        citations = [str(c) for c in citations if c]

        direction = str(entry.get("direction", "")).strip()
        if direction not in _VALID_DIRECTIONS:
            direction = ""

        out["nodes"][str(key)] = {
            "delta":      delta,
            "confidence": confidence,
            "citations":  citations,
            "reasoning":  str(entry.get("reasoning", "")),
            "direction":  direction,
        }

    if dropped:
        log.info("Dropped %d malformed node entr%s from LLM output: %s",
                 len(dropped), "y" if len(dropped) == 1 else "ies", dropped)

    return out


def analyze_document(
    content: str,
    doc_type: str,
    api_key: str = None,
    provider: str = "claude",
    doc_jurisdiction: Optional[str] = None,
    doc_level: Optional[str] = None,
) -> dict:
    """
    Send document to the selected LLM for Tetrad-grounded Bayesian node analysis.

    provider: "claude" (default, recommended) | "openai" | "gemini"

    API key resolved automatically from Streamlit secrets, environment variable,
    or api_key argument. Key name per provider:
      claude  → ANTHROPIC_API_KEY
      openai  → OPENAI_API_KEY
      gemini  → GOOGLE_API_KEY

    doc_jurisdiction: 'on', 'bc', 'ab', ... — the document's province.
                      If None, inferred from content via
                      stare_decisis.infer_document_jurisdiction().
    doc_level:        'ca', 'sc', 'pc' — the document's court level.
                      If None, inferred alongside jurisdiction.

    Returns structured dict with per-node probability adjustments,
    doctrinal reasoning, supporting text, and a stare_decisis section
    containing the document's inferred jurisdiction, authority
    classifications, and any detected inter-provincial splits.
    Fully backward-compatible — existing calls without provider=/doc_* use
    Claude and auto-detection.
    """
    provider = (provider or "claude").lower()
    if provider not in SUPPORTED_PROVIDERS:
        provider = "claude"

    # ── Stare decisis: resolve document jurisdiction ──────────────────────────
    # Priority: explicit args > auto-detection > None (unknown).
    jurisdiction_source = "explicit"
    detection = None
    if doc_jurisdiction is None or doc_level is None:
        try:
            from stare_decisis import infer_document_jurisdiction
            detection = infer_document_jurisdiction(content)
            if doc_jurisdiction is None:
                doc_jurisdiction = detection.get("province")
            if doc_level is None:
                doc_level = detection.get("court_level")
            jurisdiction_source = f"auto-detected ({detection.get('confidence')})"
        except Exception as e:
            log.info("Jurisdiction auto-detection failed: %s", e)
            jurisdiction_source = "undetermined"

    try:
        resolved_key = _resolve_key(provider, api_key)

        prompt = _build_analysis_prompt(doc_type, content)
        system = _build_system_prompt(doc_jurisdiction, doc_level)

        # Route to the selected provider
        if provider == "claude":
            raw = _call_claude(prompt, system, resolved_key)
        elif provider == "openai":
            raw = _call_openai(prompt, system, resolved_key)
        elif provider == "gemini":
            raw = _call_gemini(prompt, system, resolved_key)
        else:
            raw = _call_claude(prompt, system, resolved_key)

        parsed = _parse_json_response(raw)
        result = _validate_analysis(parsed)
        result["_provider"] = provider

        # Attach stare_decisis diagnostic block
        result["stare_decisis"] = _build_stare_decisis_result(
            doc_jurisdiction, doc_level, jurisdiction_source, detection, result
        )
        return result

    except json.JSONDecodeError as e:
        return {
            "error": f"JSON parse error ({provider}): {e}",
            "document_summary": "Analysis failed — could not parse LLM response.",
            "nodes": {},
        }
    except Exception as e:
        return {
            "error": f"{provider}: {e}",
            "document_summary": f"Analysis failed: {e}",
            "nodes": {},
        }


def _build_stare_decisis_result(
    doc_jurisdiction: Optional[str],
    doc_level: Optional[str],
    jurisdiction_source: str,
    detection: Optional[dict],
    validated_result: dict,
) -> dict:
    """Assemble the stare_decisis section attached to the analysis result.

    Collects every citation cited across all node reasoning and runs
    split detection on the flattened list. Returns a dict that app.py
    can surface in the UI.
    """
    # Flatten citations from all node entries
    all_citations: List[str] = []
    for _, entry in validated_result.get("nodes", {}).items():
        for c in entry.get("citations", []):
            if c and isinstance(c, str):
                all_citations.append(c)

    splits = []
    try:
        from stare_decisis import detect_splits
        splits = detect_splits(all_citations)
    except Exception as e:
        log.info("Split detection unavailable: %s", e)

    out = {
        "document_jurisdiction": doc_jurisdiction,
        "document_court_level":  doc_level,
        "jurisdiction_source":   jurisdiction_source,  # explicit / auto-detected(conf) / undetermined
        "inter_provincial_splits": splits,
    }
    if detection:
        out["auto_detection"] = {
            "confidence":    detection.get("confidence"),
            "rationale":     detection.get("rationale"),
            "province_hits": detection.get("province_hits"),
            "level_hits":    detection.get("level_hits"),
        }
    return out


def format_analysis_for_display(analysis: dict) -> str:
    """Format analysis result as readable text for display."""
    if "error" in analysis:
        return f"Error: {analysis['error']}"

    lines = [
        f"Document type: {analysis.get('applicable_framework', 'Unknown framework').upper()}",
        f"Summary: {analysis.get('document_summary', '')}",
        f"Morris connection: {analysis.get('connection_assessment', 'not assessed')}",
        "",
        "Node adjustments:",
    ]

    for nid_str, node_data in analysis.get("nodes", {}).items():
        delta = node_data.get("delta", 0)
        conf = node_data.get("confidence", 0)
        if abs(delta) > 0.02 and conf > 0.1:
            direction = "↑" if delta > 0 else "↓"
            lines.append(
                f"  N{nid_str}: {direction} {abs(delta):.2f} "
                f"(confidence: {conf:.0%}) — {node_data.get('reasoning', '')[:100]}"
            )

    flags = analysis.get("doctrinal_flags", [])
    if flags:
        lines += ["", "Doctrinal flags:"] + [f"  ▸ {f}" for f in flags]

    if analysis.get("ewert_concern"):
        lines.append("  ⚠️  Ewert concern flagged — actuarial tool validity questioned")

    unengaged = analysis.get("gladue_factors_present_but_unengaged", [])
    if unengaged:
        lines += ["", "Gladue factors present but previously unengaged:"] + [f"  ▸ {f}" for f in unengaged]

    return '\n'.join(lines)
