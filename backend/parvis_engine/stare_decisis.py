"""
PARVIS — Stare Decisis Layer
stare_decisis.py

Computes the binding force of an authority relative to a document under
analysis, given Canadian stare decisis rules. Operates as a deterministic
rule layer on top of doctrine.CITATION_METADATA — no LLM reasoning about
hierarchy; that is law, not interpretation.

THE HIERARCHY ENCODED HERE
──────────────────────────
  Supreme Court of Canada          binds every court in Canada
  Court of Appeal (province P)     binds all lower courts in P
                                   binds itself absent a 5-judge panel
                                   or Bedford/Carter-grounds departure
  Superior trial court (P)         binds provincial (inferior) court in P
                                   does NOT bind other SC justices (Spruce Mills)
  Provincial / inferior court (P)  binds nothing horizontally
  Federal statute                  binds everyone per its terms

Cross-jurisdiction: CA decisions from other provinces are STRONGLY persuasive
but not binding. SC decisions from other provinces are persuasive.

WHAT THIS MODULE DOES
─────────────────────
  normalize_citation(cit)               — canonical form of a citation string
  classify_authority(citation)          — metadata via doctrine.CITATION_METADATA
  binding_force(doc_jur, doc_lvl, meta) — one of the BindingForce constants
  describe_binding_force(...)           — human-readable one-liner
  detect_splits(citations)              — inter-provincial CA discord flag
  infer_document_jurisdiction(text)     — best-effort auto-detect (province + level)
  classify_authorities_for_prompt(...)  — convenience wrapper for analyzer

WHAT THIS MODULE DOES NOT DO (by design)
────────────────────────────────────────
  - Per incuriam analysis
  - Bedford/Carter horizontal-departure detection
  - Federal Court of Appeal on federal statutory questions
  - Automated citator parsing (status field is manually maintained in doctrine.py)

AUTHORS: J.S. Patel | University of London | Ethical AI Initiative
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Optional, Set, Tuple

log = logging.getLogger(__name__)


# ── Binding force constants ───────────────────────────────────────────────────

class BindingForce:
    """Enumerated binding-force values returned by binding_force()."""
    BINDING = "binding"
    STRONGLY_PERSUASIVE = "strongly_persuasive"
    PERSUASIVE = "persuasive"
    NOT_APPLICABLE = "not_applicable"     # status='overruled'
    UNDER_REVIEW = "under_review"         # status='under_appeal'
    UNKNOWN = "unknown"                   # metadata unavailable


# ── Court hierarchy ───────────────────────────────────────────────────────────
# Ranks within a single jurisdiction. Higher number = higher court.
# Used for same-province binding comparisons.

_COURT_RANK = {
    "scc":       4,
    "statute":   4,   # federal statute treated at SCC level for binding purposes
    "ca":        3,
    "sc":        2,
    "pc":        1,
    "secondary": 0,
    "unknown":   0,
}

# Canadian provincial/territorial codes this module recognises.
_PROVINCES = frozenset({
    "on", "bc", "ab", "qc", "sk", "mb", "ns", "nb", "nl", "pe", "yt", "nt", "nu"
})


# ── Citation normalisation ────────────────────────────────────────────────────

def normalize_citation(citation: str) -> str:
    """Canonical form of a citation string.

    Handles:
      - Leading/trailing whitespace
      - Optional 'R v ' / 'R. v. ' prefix for Canadian criminal citations
      - Collapsed internal whitespace
    """
    if not citation:
        return ""
    c = citation.strip()
    c = re.sub(r"\s+", " ", c)
    # Normalise R. v. / R v / R. v / Regina v forms
    c = re.sub(r"^(?:R\.?\s+v\.?\s+|Regina\s+v\.?\s+)", "R v ", c, flags=re.IGNORECASE)
    return c


def classify_authority(citation: str) -> dict:
    """Return metadata for a citation. Wraps doctrine.get_citation_metadata
    with normalisation and a safe fallback. Never raises.
    """
    norm = normalize_citation(citation)
    try:
        from doctrine import CITATION_METADATA
    except Exception as e:
        log.info("CITATION_METADATA unavailable (%s) — returning unknown.", e)
        return _unknown_metadata(norm)

    # Direct hit
    if norm in CITATION_METADATA:
        m = dict(CITATION_METADATA[norm])
        m["_citation"] = norm
        return m
    # Try with 'R v ' prefix stripped, in case registry stored differently
    stripped = re.sub(r"^R v ", "", norm)
    if stripped in CITATION_METADATA:
        m = dict(CITATION_METADATA[stripped])
        m["_citation"] = stripped
        return m
    # Try with 'R v ' prefix added
    prefixed = f"R v {norm}" if not norm.lower().startswith("r v ") else norm
    if prefixed in CITATION_METADATA:
        m = dict(CITATION_METADATA[prefixed])
        m["_citation"] = prefixed
        return m
    return _unknown_metadata(norm)


def _unknown_metadata(citation: str) -> dict:
    return {
        "_citation":    citation,
        "court_level":  "unknown",
        "jurisdiction": "unknown",
        "year":         None,
        "status":       "unknown",
        "notes":        f"Citation not in CITATION_METADATA: {citation}",
    }


# ── Binding force computation ─────────────────────────────────────────────────

def binding_force(
    doc_jurisdiction: Optional[str],
    doc_level: Optional[str],
    authority_metadata: dict,
) -> str:
    """Compute binding force of an authority relative to a document.

    Args:
      doc_jurisdiction: province code of the document ('on', 'bc', 'ab', ...)
                        or None/'unknown' if not determined.
      doc_level:        court level of the document ('ca', 'sc', 'pc')
                        or None/'unknown' if not determined.
      authority_metadata: dict returned by classify_authority().

    Returns:
      One of the BindingForce constants.
    """
    if not authority_metadata:
        return BindingForce.UNKNOWN

    status = authority_metadata.get("status", "unknown")
    if status == "overruled":
        return BindingForce.NOT_APPLICABLE
    if status == "under_appeal":
        return BindingForce.UNDER_REVIEW

    auth_level = authority_metadata.get("court_level", "unknown")
    auth_jur = authority_metadata.get("jurisdiction", "unknown")

    if auth_level == "unknown":
        return BindingForce.UNKNOWN

    # SCC and federal statutes bind everyone
    if auth_level == "scc":
        return BindingForce.BINDING
    if auth_level == "statute" and auth_jur == "federal":
        return BindingForce.BINDING

    # Secondary sources are never binding
    if auth_level == "secondary":
        return BindingForce.PERSUASIVE

    # For CA / SC / PC authorities we need the document's jurisdiction
    # to make a binding/persuasive determination. Without it, fall back
    # to 'unknown' — but return STRONGLY_PERSUASIVE for CA authorities
    # since they are at least that much, wherever the document is from.
    doc_jur = (doc_jurisdiction or "unknown").lower()
    doc_lvl = (doc_level or "unknown").lower()

    if doc_jur == "unknown" or doc_jur not in _PROVINCES:
        # We don't know the document's province — can't determine binding force.
        # CA-level authorities are at least strongly persuasive; SC/PC are
        # persuasive. This is the safest default.
        if auth_level == "ca":
            return BindingForce.STRONGLY_PERSUASIVE
        return BindingForce.PERSUASIVE

    # Same-jurisdiction analysis
    if auth_jur == doc_jur:
        if doc_lvl == "unknown" or doc_lvl not in _COURT_RANK:
            # Safest assumption: same-province CA is binding on most courts.
            if auth_level == "ca":
                return BindingForce.BINDING
            return BindingForce.PERSUASIVE
        auth_rank = _COURT_RANK.get(auth_level, 0)
        doc_rank = _COURT_RANK.get(doc_lvl, 0)
        if auth_rank > doc_rank:
            return BindingForce.BINDING
        if auth_rank == doc_rank:
            # Horizontal stare decisis:
            #   CA binds itself (subject to 5-panel / Bedford)
            #   SC/PC do NOT bind themselves (Spruce Mills comity)
            if auth_level == "ca":
                return BindingForce.BINDING
            return BindingForce.PERSUASIVE
        # Lower court decision; generally persuasive upward at best
        return BindingForce.PERSUASIVE

    # Cross-jurisdiction
    #   Other-province CA  → strongly persuasive
    #   Other-province SC  → persuasive
    #   Other-province PC  → persuasive (typically weakly so)
    if auth_level == "ca":
        return BindingForce.STRONGLY_PERSUASIVE
    return BindingForce.PERSUASIVE


def describe_binding_force(
    force: str,
    authority_metadata: dict,
    doc_jurisdiction: Optional[str],
    doc_level: Optional[str],
) -> str:
    """One-line human-readable explanation of the binding-force determination."""
    cit = authority_metadata.get("_citation", "(unknown citation)")
    lvl = authority_metadata.get("court_level", "unknown")
    jur = authority_metadata.get("jurisdiction", "unknown")
    status = authority_metadata.get("status", "unknown")
    doc_desc = _describe_document(doc_jurisdiction, doc_level)

    if force == BindingForce.NOT_APPLICABLE:
        return f"{cit} — overruled; no longer good law"
    if force == BindingForce.UNDER_REVIEW:
        return f"{cit} — under appeal to SCC; currently binding but may change"
    if force == BindingForce.UNKNOWN:
        return f"{cit} — metadata unavailable; binding force cannot be determined"

    if lvl == "scc":
        return f"{cit} — SCC authority; binding on {doc_desc}"
    if lvl == "statute":
        return f"{cit} — federal statute; binds {doc_desc} per its terms"
    if lvl == "secondary":
        return f"{cit} — academic/policy source; persuasive only"

    if force == BindingForce.BINDING:
        return (f"{cit} — {_describe_court(lvl, jur)}; binding on {doc_desc}"
                f" (same-province hierarchy)")
    if force == BindingForce.STRONGLY_PERSUASIVE:
        return (f"{cit} — {_describe_court(lvl, jur)}; strongly persuasive on "
                f"{doc_desc} (cross-province CA authority)")
    return (f"{cit} — {_describe_court(lvl, jur)}; persuasive on {doc_desc}")


def _describe_court(level: str, jur: str) -> str:
    level_names = {
        "scc": "Supreme Court of Canada", "ca": "Court of Appeal",
        "sc": "superior trial court", "pc": "provincial/inferior court",
        "statute": "federal statute", "secondary": "secondary source",
    }
    jur_names = {
        "federal": "federal", "on": "Ontario", "bc": "British Columbia",
        "ab": "Alberta", "qc": "Quebec", "sk": "Saskatchewan",
        "mb": "Manitoba", "ns": "Nova Scotia", "nb": "New Brunswick",
        "nl": "Newfoundland and Labrador", "pe": "Prince Edward Island",
        "yt": "Yukon", "nt": "Northwest Territories", "nu": "Nunavut",
        "none": "",
    }
    ln = level_names.get(level, level)
    jn = jur_names.get(jur, jur)
    return f"{jn} {ln}".strip()


def _describe_document(doc_jur: Optional[str], doc_lvl: Optional[str]) -> str:
    if not doc_jur or doc_jur == "unknown":
        return "the document (jurisdiction undetermined)"
    return _describe_court(doc_lvl or "unknown", doc_jur) + " document"


# ── Inter-provincial split detection ──────────────────────────────────────────

def detect_splits(citations: List[str]) -> List[dict]:
    """Flag potential inter-provincial CA splits.

    Groups CA-level authorities by province. If two or more provinces' CAs
    appear in the same citation list, flag it: the analyst should verify
    whether the CAs agree on the relevant rule or whether an inter-provincial
    split exists.

    Returns a list of split-indicator dicts (typically zero or one entry).
    """
    if not citations:
        return []

    ca_by_province: Dict[str, List[str]] = {}
    for c in citations:
        m = classify_authority(c)
        if m.get("court_level") == "ca" and m.get("jurisdiction") in _PROVINCES:
            ca_by_province.setdefault(m["jurisdiction"], []).append(m["_citation"])

    if len(ca_by_province) < 2:
        return []

    return [{
        "kind": "inter_provincial_ca",
        "provinces": sorted(ca_by_province.keys()),
        "authorities_by_province": ca_by_province,
        "note": (
            f"Authorities from {len(ca_by_province)} provincial Courts of Appeal "
            f"cited together ({', '.join(sorted(ca_by_province.keys()))}). "
            f"Verify whether these authorities agree on the relevant rule, "
            f"or whether an inter-provincial split exists. A CA decision from "
            f"another province is strongly persuasive but not binding on this "
            f"document."
        ),
    }]


# ── Document jurisdiction detection ───────────────────────────────────────────

_PROVINCE_TEXT_PATTERNS = {
    "on": [r"\bOntario\b", r"\bONCA\b", r"\bONSC\b", r"\bOCJ\b",
           r"\bOntario Court of (?:Appeal|Justice)\b",
           r"\bSuperior Court of Justice\b", r"\bToronto\b", r"\bOttawa\b"],
    "bc": [r"\bBritish Columbia\b", r"\bBCCA\b", r"\bBCSC\b", r"\bPCBC\b",
           r"\bVancouver\b", r"\bVictoria\b"],
    "ab": [r"\bAlberta\b", r"\bABCA\b", r"\bABKB\b", r"\bABQB\b", r"\bACJ\b",
           r"\bAlberta Court of Appeal\b", r"\bAlberta Court of Justice\b",
           r"\bAlberta King's Bench\b", r"\bCalgary\b", r"\bEdmonton\b"],
    "qc": [r"\bQu[eé]bec\b", r"\bQCCA\b", r"\bQCCS\b",
           r"\bCour du Qu[eé]bec\b", r"\bMontr[eé]al\b"],
    "sk": [r"\bSaskatchewan\b", r"\bSKCA\b", r"\bSKKB\b", r"\bSKQB\b",
           r"\bPCSK\b", r"\bRegina\b", r"\bSaskatoon\b"],
    "mb": [r"\bManitoba\b", r"\bMBCA\b", r"\bMBKB\b", r"\bMBQB\b",
           r"\bPCM\b", r"\bWinnipeg\b"],
    "ns": [r"\bNova Scotia\b", r"\bNSCA\b", r"\bNSSC\b", r"\bHalifax\b"],
    "nb": [r"\bNew Brunswick\b", r"\bNBCA\b", r"\bNBQB\b", r"\bNBKB\b",
           r"\bFredericton\b"],
    "nl": [r"\bNewfoundland\b", r"\bNLCA\b", r"\bNLSC\b", r"\bSt\. ?John's\b"],
    "pe": [r"\bPrince Edward Island\b", r"\bPECA\b", r"\bPESC\b",
           r"\bCharlottetown\b"],
    "yt": [r"\bYukon\b", r"\bYKCA\b", r"\bYKSC\b", r"\bWhitehorse\b"],
    "nt": [r"\bNorthwest Territories\b", r"\bNWTCA\b", r"\bNWTSC\b",
           r"\bYellowknife\b"],
    "nu": [r"\bNunavut\b", r"\bNUCA\b", r"\bNUCJ\b", r"\bIqaluit\b"],
}

_LEVEL_TEXT_PATTERNS = {
    "ca": [r"\bCourt of Appeal\b", r"\b(?:ON|BC|AB|QC|SK|MB|NS|NB|NL|PE|YT|NT|NU)CA\b"],
    "sc": [r"\bKing'?s Bench\b", r"\bQueen'?s Bench\b",
           r"\bSuperior Court(?!\s+of\s+Justice\s+of\s+Ontario)\b",
           # "Supreme Court of [Province]" — the trial superior court in BC, NS, NL,
           # PE, YT, NT. Negative lookahead excludes "Supreme Court of Canada".
           r"\bSupreme Court of (?!Canada\b)(?:British Columbia|Nova Scotia|"
           r"Newfoundland|Prince Edward Island|Yukon|Northwest Territories)\b",
           r"\bONSC\b", r"\b(?:BCSC|NSSC|NLSC)\b",
           r"\b(?:ABKB|SKKB|MBKB|NBKB)\b",
           r"\b(?:ABQB|SKQB|MBQB|NBQB)\b"],
    "pc": [r"\bProvincial Court\b", r"\bCourt of Justice\b",
           r"\b(?:ACJ|OCJ|NUCJ)\b", r"\bPC(?:BC|SK|M)\b",
           r"\bCour du Qu[eé]bec\b"],
}


def infer_document_jurisdiction(text: str, max_scan_chars: int = 5000) -> dict:
    """Best-effort extraction of (province, court_level, confidence).

    Scans the first max_scan_chars of the text for court names, citation
    patterns, and place names. Returns:
      {
        "province":   Optional[str],     # 'on', 'bc', 'ab', ... or None
        "court_level": Optional[str],    # 'ca', 'sc', 'pc' or None
        "confidence": 'high' | 'medium' | 'low' | 'none',
        "province_hits": dict,           # counts per province
        "level_hits":    dict,           # counts per level
        "rationale":     str,            # short human-readable summary
      }

    Note on citation contamination: a document *citing* R v Ellis 2022 BCCA 278
    should not be classified as a BCCA decision. We strip citation patterns
    before scanning for court level. For province, we keep them — a document
    citing BCCA cases still tells us something about jurisdictional context,
    but court name in the document header is weighted more heavily.
    """
    if not text:
        return _no_detection("empty text")

    scan = text[:max_scan_chars]
    scan_stripped = _strip_citations(scan)

    # Province patterns run against full text (citations are fine signals)
    province_hits = {}
    for prov, patterns in _PROVINCE_TEXT_PATTERNS.items():
        count = 0
        for p in patterns:
            count += len(re.findall(p, scan, flags=re.IGNORECASE))
        if count:
            province_hits[prov] = count

    # Level patterns run against CITATION-STRIPPED text — a document citing
    # an ONCA decision is not itself at the CA level.
    level_hits = {}
    for lvl, patterns in _LEVEL_TEXT_PATTERNS.items():
        count = 0
        for p in patterns:
            count += len(re.findall(p, scan_stripped, flags=re.IGNORECASE))
        if count:
            level_hits[lvl] = count

    if not province_hits and not level_hits:
        return _no_detection("no jurisdictional markers found")

    # Pick best province and level
    province = max(province_hits, key=province_hits.get) if province_hits else None
    level = max(level_hits, key=level_hits.get) if level_hits else None

    # Confidence heuristic: strong if top hit dominates, medium if ambiguous
    confidence = _classify_confidence(province_hits, level_hits)

    rationale_parts = []
    if province:
        rationale_parts.append(f"province={province} ({province_hits[province]} hits)")
    if level:
        rationale_parts.append(f"level={level} ({level_hits[level]} hits)")
    if len(province_hits) > 1:
        others = sorted(province_hits.items(), key=lambda kv: -kv[1])[1:3]
        rationale_parts.append(
            "also: " + ", ".join(f"{p}={n}" for p, n in others)
        )

    return {
        "province":      province,
        "court_level":   level,
        "confidence":    confidence,
        "province_hits": province_hits,
        "level_hits":    level_hits,
        "rationale":     "; ".join(rationale_parts) or "weak signal",
    }


# Patterns that strip citation-shaped substrings so they don't contaminate
# document-level detection. Order matters — strip specific forms first.
_CITATION_STRIP_PATTERNS = [
    # Neutral citation: 2022 ABCA 48, 2021 ONCA 680, 2018 SCC 30, etc.
    r"\d{4}\s+(?:SCC|ONCA|BCCA|ABCA|QCCA|SKCA|MBCA|NSCA|NBCA|NLCA|PECA|"
    r"YKCA|NWTCA|NUCA|ONSC|BCSC|ABKB|ABQB|SKKB|SKQB|MBKB|MBQB|NSSC|NBKB|"
    r"NBQB|NLSC|PESC|YKSC|NWTSC|NUCJ|ACJ|OCJ)\s+\d+",
    # Old SCR-style: [1999] 1 SCR 688 / [2018] 1 SCR 123
    r"\[\d{4}\]\s*\d*\s*S\.?C\.?R\.?\s*\d+",
    # Name v Canada [2018] SCC 30 style (Ewert etc.)
    r"[A-Z][A-Za-z]+\s+v\.?\s+[A-Z][A-Za-z]+,?\s*\[\d{4}\]\s*SCC\s*\d+",
]


def _strip_citations(text: str) -> str:
    """Remove citation-shaped substrings so court-level pattern scanning
    sees only the document's own court references, not cases it cites."""
    out = text
    for p in _CITATION_STRIP_PATTERNS:
        out = re.sub(p, " [CITATION] ", out, flags=re.IGNORECASE)
    return out


def _classify_confidence(province_hits: dict, level_hits: dict) -> str:
    if not province_hits:
        return "none"
    sorted_p = sorted(province_hits.values(), reverse=True)
    if sorted_p[0] >= 3 and (len(sorted_p) == 1 or sorted_p[0] >= 2 * sorted_p[1]):
        return "high" if level_hits else "medium"
    if sorted_p[0] >= 2:
        return "medium"
    return "low"


def _no_detection(rationale: str) -> dict:
    return {
        "province": None, "court_level": None, "confidence": "none",
        "province_hits": {}, "level_hits": {}, "rationale": rationale,
    }


# ── Convenience wrappers for the analyzer ─────────────────────────────────────

def classify_authorities_for_prompt(
    doc_jurisdiction: Optional[str],
    doc_level: Optional[str],
    citations: Optional[List[str]] = None,
) -> List[dict]:
    """Build a pre-classified authority table for the system prompt.

    If citations is None, uses every entry in CITATION_METADATA — the
    complete PARVIS doctrinal library. If given a list, classifies only
    those.

    Returns a list of dicts with: citation, court_level, jurisdiction,
    status, binding_force, description.
    """
    try:
        from doctrine import CITATION_METADATA
    except Exception:
        return []

    target_cits = citations if citations is not None else list(CITATION_METADATA.keys())
    out = []
    for c in target_cits:
        meta = classify_authority(c)
        force = binding_force(doc_jurisdiction, doc_level, meta)
        out.append({
            "citation":      meta.get("_citation", c),
            "court_level":   meta.get("court_level"),
            "jurisdiction":  meta.get("jurisdiction"),
            "status":        meta.get("status"),
            "year":          meta.get("year"),
            "binding_force": force,
            "description":   describe_binding_force(force, meta, doc_jurisdiction, doc_level),
        })
    return out
