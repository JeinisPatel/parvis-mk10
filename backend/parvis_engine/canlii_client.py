"""
PARVIS — CanLII API Client (April 28 2026 rebuild)
canlii_client.py

Queries the CanLII API (api.canlii.org) for recent Canadian decisions
relevant to the PARVIS node schema and the binding-authority corpus.

PURPOSE:
  doctrine.py provides the structural anchor (static authoritative rules).
  This module surfaces NEW developments — recent decisions that may have
  moved or refined the doctrine since doctrine.py was last updated.

API SURFACE (exposed to app.py):
  Existing (back-compat):
    search_node_developments(node_id, max_results, user_jurisdiction, date_floor_label) → dict
    get_tetrad_updates(since_year=2023) → dict
    is_configured() → bool
  
  New (April 27 2026 rebuild, restored April 28 2026):
    search_with_filters(query, user_jurisdiction, date_floor_label, max_results) → dict
    get_tracked_updates(date_floor_label, user_jurisdiction, corpus) → dict
    flatten_search_results(tiered_dict) → list
    validate_api_key() → dict {valid, error}
    ALL_TRACKED_CITATIONS — combined corpus
    TETRAD_CITATIONS — Gladue/Ipeelee/Morris/Ewert lineage
    PROPORTIONALITY_CITATIONS — Lacasse/Friesen/Bissonnette/Sharma lineage

JURISDICTION TIERING:
  Per Canadian stare decisis: SCC binding everywhere; provincial CA binding
  in own province, persuasive elsewhere; lower courts always Other.

HOW TO GET A CANLII API KEY:
  1. Go to https://api.canlii.org
  2. Register for a free account (non-commercial use)
  3. Add to Streamlit secrets: CANLII_API_KEY = "your-key-here"
     OR set environment variable: export CANLII_API_KEY="your-key-here"

RATE LIMITS: CanLII free API — 100 requests/hour.
PARVIS caches results to avoid redundant calls.

AUTHORS: J.S. Patel | University of London | Ethical AI Initiative
"""

import os
import json
import time
import hashlib
import streamlit as st
import requests
from datetime import datetime, timedelta
from typing import Optional


# ── CanLII API configuration ──────────────────────────────────────────────────
CANLII_BASE_URL = "https://api.canlii.org/v1"
CACHE_TTL_HOURS = 24


# ── Database identifier mapping for citation tracking ─────────────────────────
# CanLII uses short database codes; map for clarity.
COURT_DATABASES = {
    "scc": "csc-scc", "csc": "csc-scc",
    "onca": "onca", "bcca": "bcca", "abca": "abca",
    "qcca": "qcca", "skca": "skca", "mbca": "mbca",
    "nsca": "nsca", "nbca": "nbca", "nlca": "nlca",
    "peca": "peca", "ytca": "ytca", "ntca": "ntca", "nuca": "nuca",
}


# ── Jurisdiction tiering — Canadian stare decisis ─────────────────────────────
# SCC is binding everywhere. Provincial CA is binding in own province,
# persuasive elsewhere. Lower courts are always Other tier.
def _classify_tier(database: str, user_jurisdiction: str) -> str:
    """Classify a case as binding, persuasive, or other for the user's jurisdiction.
    
    user_jurisdiction: ISO-style 2-letter province code or "*" for uniform tagging
    """
    db = (database or "").lower()
    if db in ("csc-scc", "scc"):
        return "binding"  # SCC binds everyone
    if user_jurisdiction == "*":
        return "binding" if "ca" in db and len(db) <= 5 else "persuasive"
    # Provincial CA: binding in own province only
    user_lower = user_jurisdiction.lower()
    province_to_ca = {
        "on": "onca", "bc": "bcca", "ab": "abca", "qc": "qcca",
        "sk": "skca", "mb": "mbca", "ns": "nsca", "nb": "nbca",
        "nl": "nlca", "pe": "peca", "yt": "ytca", "nt": "ntca", "nu": "nuca",
    }
    own_ca = province_to_ca.get(user_lower)
    if own_ca and db == own_ca:
        return "binding"
    # Other provincial CA → persuasive
    if db in province_to_ca.values():
        return "persuasive"
    return "other"


# ── Date floor mapping ────────────────────────────────────────────────────────
def _date_floor_to_year(date_floor_label: str) -> Optional[int]:
    """Map UI label to a year cutoff. Returns None for 'All'."""
    today = datetime.now()
    mapping = {
        "1 year":  today.year - 1,
        "3 years": today.year - 3,
        "5 years": today.year - 5,
        "All":     None,
    }
    return mapping.get(date_floor_label, today.year - 3)


# ── Node-specific search queries (CH5 canonical taxonomy) ─────────────────────
NODE_SEARCH_QUERIES = {
    # Per Chapter 5 (April 11, 2026) canonical taxonomy.
    # ── Substantive Risk Layer ───────────────────────────────────────────
    2:  ["dangerous offender pattern behaviour", "s753 violent history pattern"],
    3:  ["sexual offence risk profile sentencing", "Ewert sexual offence assessment cultural"],
    4:  ["dynamic risk factors sentencing", "criminogenic needs sentencing Indigenous"],
    # ── Systemic Distortion and Doctrinal Fidelity Layer ─────────────────
    5:  ["Ewert actuarial cultural validity sentencing", "risk assessment Indigenous cultural validity"],
    6:  ["ineffective counsel Gladue Indigenous", "GDB ineffective assistance sentencing"],
    7:  ["bail denial coercive plea Indigenous", "Antic wrongful guilty plea"],
    8:  ["FASD sentencing mitigation", "fetal alcohol spectrum disorder dangerous offender"],
    9:  ["intergenerational trauma Gladue", "residential school sentencing Indigenous", "cultural programming unavailable Natomagan"],
    10: ["Gladue misapplication Morris sentencing", "social context evidence judicial misapplication"],
    11: ["rehabilitation gaming dangerous offender", "strategic rehabilitation sentencing"],
    12: ["judicial reasoning reliability sentencing", "judging the judge Gladue compliance"],
    13: ["structural systemic bias TraceRoute sentencing", "systemic discrimination Indigenous sentencing"],
    14: ["temporal distortion prior convictions", "outdated sentencing regime mandatory minimum"],
    15: ["interjurisdictional tariff distortion", "provincial sentencing parity disparity"],
    16: ["s.718.04 victim aggravation Gladue mitigation conflict", "Indigenous victim Indigenous offender sentencing"],
    17: ["over-policing criminal record sentencing", "Le racial profiling criminal record contamination"],
    18: ["Gladue Ewert Morris Ellis profile audit", "social context evidence integration prior convictions"],
    19: ["collider bias incarceration sentencing", "Berkson selection effect criminal justice data"],
    # ── Structural Output ────────────────────────────────────────────────
    20: ["dangerous offender designation Gladue", "DO designation Morris Ellis Ewert"],
}


# ── Tracked binding-authority corpus ──────────────────────────────────────────
# Each entry: db (CanLII database code), id (case identifier), label (display),
#             corpus ("Distortion" = Tetrad lineage / "Proportionality" = severity)
TETRAD_CITATIONS = [
    {"db": "csc-scc", "id": "1999/1999scc679/1999scc679",  "label": "R v Gladue [1999] 1 SCR 688",         "corpus": "Distortion"},
    {"db": "csc-scc", "id": "2012/2012scc13/2012scc13",     "label": "R v Ipeelee [2012] 1 SCR 433",        "corpus": "Distortion"},
    {"db": "onca",    "id": "2021/2021onca680/2021onca680", "label": "R v Morris 2021 ONCA 680",            "corpus": "Distortion"},
    {"db": "csc-scc", "id": "2018/2018scc30/2018scc30",     "label": "Ewert v Canada [2018] 2 SCR 165",     "corpus": "Distortion"},
    {"db": "bcca",    "id": "2022/2022bcca278/2022bcca278", "label": "R v Ellis 2022 BCCA 278",             "corpus": "Distortion"},
    {"db": "abca",    "id": "2022/2022abca48/2022abca48",   "label": "R v Natomagan 2022 ABCA 48",          "corpus": "Distortion"},
    {"db": "onca",    "id": "2024/2024onca8/2024onca8",     "label": "R v Bourdon 2024 ONCA 8",             "corpus": "Distortion"},
    {"db": "csc-scc", "id": "2017/2017scc27/2017scc27",     "label": "R v Antic [2017] 1 SCR 509",          "corpus": "Distortion"},
    {"db": "csc-scc", "id": "2019/2019scc34/2019scc34",     "label": "R v Le [2019] 2 SCR 692",             "corpus": "Distortion"},
    {"db": "csc-scc", "id": "2017/2017scc64/2017scc64",     "label": "R v Boutilier [2017] 2 SCR 936",      "corpus": "Distortion"},
]

PROPORTIONALITY_CITATIONS = [
    {"db": "csc-scc", "id": "2015/2015scc64/2015scc64", "label": "R v Lacasse [2015] 3 SCR 1089",      "corpus": "Proportionality"},
    {"db": "csc-scc", "id": "2020/2020scc9/2020scc9",   "label": "R v Friesen [2020] 1 SCR 424",       "corpus": "Proportionality"},
    {"db": "csc-scc", "id": "2022/2022scc23/2022scc23", "label": "R v Bissonnette 2022 SCC 23",        "corpus": "Proportionality"},
    {"db": "csc-scc", "id": "2022/2022scc39/2022scc39", "label": "R v Sharma 2022 SCC 39",             "corpus": "Proportionality"},
    {"db": "csc-scc", "id": "2015/2015scc15/2015scc15", "label": "R v Nur [2015] 1 SCR 773",           "corpus": "Proportionality"},
    {"db": "csc-scc", "id": "2016/2016scc13/2016scc13", "label": "R v Lloyd [2016] 1 SCR 130",         "corpus": "Proportionality"},
]

ALL_TRACKED_CITATIONS = TETRAD_CITATIONS + PROPORTIONALITY_CITATIONS


# ═══════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═══════════════════════════════════════════════════════════════════════════

def _get_api_key() -> Optional[str]:
    """Resolve CanLII API key from Streamlit secrets or environment."""
    try:
        if hasattr(st, "secrets") and "CANLII_API_KEY" in st.secrets:
            return st.secrets["CANLII_API_KEY"]
    except Exception:
        pass
    return os.environ.get("CANLII_API_KEY")


def _cache_key(query: str) -> str:
    return hashlib.md5(query.encode()).hexdigest()


def _normalise_case(case: dict) -> dict:
    """Normalise a CanLII case payload into the shape app.py expects."""
    cid = case.get("caseId", {})
    if isinstance(cid, dict):
        cid_str = cid.get("en", "") or cid.get("fr", "")
    else:
        cid_str = str(cid) if cid else ""
    db = case.get("databaseId", "")
    return {
        "title":     case.get("title", "") or case.get("citation", ""),
        "citation":  case.get("citation", "") or case.get("title", ""),
        "date":      case.get("decisionDate", ""),
        "url":       case.get("url", ""),
        "database":  db,
        "case_id":   cid_str,
    }


def _tier_results(cases: list, user_jurisdiction: str, year_floor: Optional[int]) -> dict:
    """Sort cases into binding/persuasive/other tiers, applying date floor."""
    binding, persuasive, other = [], [], []
    for c in cases:
        nc = _normalise_case(c)
        # Date filter
        if year_floor is not None:
            year_str = (nc.get("date") or "")[:4]
            try:
                if int(year_str) < year_floor:
                    continue
            except ValueError:
                pass
        tier = _classify_tier(nc.get("database", ""), user_jurisdiction)
        if tier == "binding":
            binding.append(nc)
        elif tier == "persuasive":
            persuasive.append(nc)
        else:
            other.append(nc)
    # Sort each tier by date desc
    for tier_list in (binding, persuasive, other):
        tier_list.sort(key=lambda x: x.get("date", ""), reverse=True)
    return {
        "binding":    binding,
        "persuasive": persuasive,
        "other":      other,
        "total":      len(binding) + len(persuasive) + len(other),
        "error":      None,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Core API calls (cached)
# ═══════════════════════════════════════════════════════════════════════════

@st.cache_data(ttl=3600 * CACHE_TTL_HOURS, show_spinner=False)
def search_canlii(query: str, language: str = "en", results_per_page: int = 5) -> dict:
    """Search CanLII for cases matching query."""
    api_key = _get_api_key()
    if not api_key:
        return {"results": [], "total_count": 0,
                "error": "No CanLII API key configured. Add CANLII_API_KEY to Streamlit secrets."}

    url = f"{CANLII_BASE_URL}/caseBrowse/{language}/"
    params = {
        "api_key": api_key,
        "fullText": query,
        "resultCount": results_per_page,
        "offset": 0,
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            "results": data.get("cases", []),
            "total_count": data.get("totalCount", 0),
            "error": None,
        }
    except requests.Timeout:
        return {"results": [], "total_count": 0, "error": "CanLII API timeout"}
    except requests.HTTPError as e:
        return {"results": [], "total_count": 0, "error": f"CanLII API error: {e}"}
    except Exception as e:
        return {"results": [], "total_count": 0, "error": str(e)}


@st.cache_data(ttl=3600 * CACHE_TTL_HOURS, show_spinner=False)
def get_case_text(database_id: str, case_id: str) -> dict:
    """Retrieve full text of a specific CanLII decision."""
    api_key = _get_api_key()
    if not api_key:
        return {"content": None, "error": "No CanLII API key"}
    url = f"{CANLII_BASE_URL}/caseBrowse/en/{database_id}/{case_id}/"
    try:
        resp = requests.get(url, params={"api_key": api_key}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return {
            "content":  data.get("content", ""),
            "title":    data.get("title", ""),
            "citation": data.get("citation", ""),
            "date":     data.get("decisionDate", ""),
            "url":      data.get("url", ""),
            "error":    None,
        }
    except Exception as e:
        return {"content": None, "error": str(e)}


@st.cache_data(ttl=3600 * CACHE_TTL_HOURS, show_spinner=False)
def get_citing_cases(database_id: str, case_id: str, results: int = 10) -> dict:
    """Get cases that cite a specific decision."""
    api_key = _get_api_key()
    if not api_key:
        return {"cases": [], "error": "No CanLII API key"}
    url = f"{CANLII_BASE_URL}/caseCitator/en/{database_id}/{case_id}/citingCases"
    try:
        resp = requests.get(url, params={"api_key": api_key, "resultCount": results}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {"cases": data.get("citingCases", []), "error": None}
    except Exception as e:
        return {"cases": [], "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# Public API surface (consumed by app.py)
# ═══════════════════════════════════════════════════════════════════════════

def is_configured() -> bool:
    """Check if CanLII API key is available."""
    return bool(_get_api_key())


def validate_api_key() -> dict:
    """Probe API with a trivial query to verify the configured key works.
    Returns {valid: bool, error: str|None}.
    """
    if not _get_api_key():
        return {"valid": False, "error": "No CanLII API key configured"}
    # Trivial probe: search for "Antic" with 1 result
    probe = search_canlii("Antic bail", results_per_page=1)
    if probe.get("error"):
        return {"valid": False, "error": probe["error"]}
    return {"valid": True, "error": None}


def search_node_developments(node_id: int, max_results: int = 5,
                              user_jurisdiction: str = "*",
                              date_floor_label: str = "3 years") -> dict:
    """Search CanLII for recent decisions relevant to a specific PARVIS node.
    
    Returns tiered dict: {binding, persuasive, other, total, error}
    """
    queries = NODE_SEARCH_QUERIES.get(node_id, [])
    if not queries:
        return {"binding": [], "persuasive": [], "other": [], "total": 0, "error": None}

    year_floor = _date_floor_to_year(date_floor_label)
    all_cases = []
    seen_ids = set()
    last_error = None

    for query in queries[:2]:  # First 2 queries to stay within rate limits
        data = search_canlii(query, results_per_page=max_results * 2)
        if data.get("error"):
            last_error = data["error"]
            continue
        for case in data.get("results", []):
            cid = case.get("caseId", {})
            cid_str = cid.get("en", "") if isinstance(cid, dict) else str(cid)
            if cid_str and cid_str not in seen_ids:
                seen_ids.add(cid_str)
                all_cases.append(case)

    if not all_cases and last_error:
        return {"binding": [], "persuasive": [], "other": [], "total": 0, "error": last_error}

    tiered = _tier_results(all_cases, user_jurisdiction, year_floor)
    # Cap each tier
    tiered["binding"] = tiered["binding"][:max_results]
    tiered["persuasive"] = tiered["persuasive"][:max_results]
    tiered["other"] = tiered["other"][:max_results]
    tiered["total"] = len(tiered["binding"]) + len(tiered["persuasive"]) + len(tiered["other"])
    return tiered


def search_with_filters(query: str, user_jurisdiction: str = "*",
                         date_floor_label: str = "3 years",
                         max_results: int = 8) -> dict:
    """Free-text search with jurisdiction tiering and date floor.
    
    Returns tiered dict: {binding, persuasive, other, total, error}
    """
    if not query.strip():
        return {"binding": [], "persuasive": [], "other": [], "total": 0,
                "error": "Empty query"}
    year_floor = _date_floor_to_year(date_floor_label)
    data = search_canlii(query.strip(), results_per_page=max_results * 2)
    if data.get("error"):
        return {"binding": [], "persuasive": [], "other": [], "total": 0,
                "error": data["error"]}
    tiered = _tier_results(data.get("results", []), user_jurisdiction, year_floor)
    tiered["binding"] = tiered["binding"][:max_results]
    tiered["persuasive"] = tiered["persuasive"][:max_results]
    tiered["other"] = tiered["other"][:max_results]
    tiered["total"] = len(tiered["binding"]) + len(tiered["persuasive"]) + len(tiered["other"])
    return tiered


def get_tracked_updates(date_floor_label: str = "3 years",
                         user_jurisdiction: str = "*",
                         corpus: str = "all") -> dict:
    """Check for recent citing cases for tracked binding-authority corpus.
    
    corpus: "all" | "Distortion" | "Proportionality"
    
    Returns dict keyed by case label, each value is:
      {corpus, total, binding, persuasive, other}
    """
    if corpus.lower() == "distortion":
        sources = TETRAD_CITATIONS
    elif corpus.lower() == "proportionality":
        sources = PROPORTIONALITY_CITATIONS
    else:
        sources = ALL_TRACKED_CITATIONS

    year_floor = _date_floor_to_year(date_floor_label)
    updates = {}
    for case in sources:
        citing = get_citing_cases(
            database_id=case["db"],
            case_id=case["id"],
            results=15,
        )
        if citing.get("error"):
            continue
        cases_list = citing.get("cases", [])
        if not cases_list:
            continue
        tiered = _tier_results(cases_list, user_jurisdiction, year_floor)
        if tiered["total"] == 0:
            continue
        # Cap each tier for display
        tiered["binding"]    = tiered["binding"][:6]
        tiered["persuasive"] = tiered["persuasive"][:6]
        tiered["other"]      = tiered["other"][:6]
        tiered["corpus"]     = case.get("corpus", "Distortion")
        updates[case["label"]] = tiered
    return updates


def get_tetrad_updates(since_year: int = 2023) -> dict:
    """Back-compat: simple Tetrad-only update check.
    Returns {label: [citing_cases]} for citing cases since since_year.
    """
    updates = {}
    for case in TETRAD_CITATIONS:
        citing = get_citing_cases(
            database_id=case["db"],
            case_id=case["id"],
            results=10,
        )
        if citing.get("error"):
            continue
        recent = [
            c for c in citing.get("cases", [])
            if c.get("decisionDate", "")[:4] >= str(since_year)
        ]
        if recent:
            updates[case["label"]] = recent
    return updates


def flatten_search_results(tiered_dict: dict) -> list:
    """Flatten a tiered result dict into a single list, preserving tier label.
    
    Useful for downstream rendering that doesn't need tier separation.
    """
    out = []
    for tier_key, tier_label in [("binding", "Binding"),
                                   ("persuasive", "Persuasive"),
                                   ("other", "Other")]:
        for case in tiered_dict.get(tier_key, []):
            entry = dict(case)
            entry["tier"] = tier_label
            out.append(entry)
    return out


def format_canlii_results(results: list, node_name: str = "") -> str:
    """Format CanLII search results as readable text."""
    if not results:
        return "No recent CanLII decisions found."
    header = f"Recent CanLII decisions relevant to {node_name}:\n" if node_name else "Recent decisions:\n"
    lines = [header]
    for r in results:
        date = r.get("date", "")[:10] if r.get("date") else "Date unknown"
        lines.append(f"  [{date}] {r.get('citation', r.get('title', '—'))}")
        if r.get("url"):
            lines.append(f"    {r['url']}")
    return "\n".join(lines)
