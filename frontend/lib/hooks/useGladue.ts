'use client';

/**
 * useGladue — Gladue factors screen hook
 *
 * Manages per-case factor state, per-factor narrative drafting, and full
 * streaming narrative generation. Mirrors the backend
 * parvis_engine/_gladue_factors.py module: the FACTORS list and the
 * evidence-suggestion thresholds are duplicated here so the screen renders
 * without a backend round-trip per interaction. The LLM-touched paths
 * (suggestText, generateNarrative) go to the backend.
 *
 * Persistence: localStorage key `parvis.mk9.gladue.{caseSlug}`.
 * Streaming:   generateNarrative consumes a text/plain ReadableStream and
 *              appends chunks to state.narrative as they arrive.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readApiKeySync } from './useApiKey';


// ── Factor metadata (mirrors backend _gladue_factors.py) ────────────────────

export type GladueCategory = 'systemic' | 'individual' | 'sentencing';

export interface GladueFactorMeta {
  key:           string;
  label:         string;
  category:      GladueCategory;
  case_anchor:   string;
  description:   string;
  suggests_node?: string;
}

export const GLADUE_FACTORS: ReadonlyArray<GladueFactorMeta> = [
  // ── Systemic ──
  { key: 'residential_schools',        label: 'Residential school exposure',          category: 'systemic',   case_anchor: 'Gladue ¶66',  description: 'Direct or intergenerational residential school exposure. Among the most consistently weighty Gladue factors.', suggests_node: 'N10' },
  { key: 'child_welfare',              label: 'Child welfare involvement',            category: 'systemic',   case_anchor: 'Ipeelee ¶60', description: 'Sixties-scoop or current CFS involvement.', suggests_node: 'N10' },
  { key: 'loss_of_culture',            label: 'Loss of culture / language',           category: 'systemic',   case_anchor: 'Gladue ¶66',  description: 'Disconnection from language, ceremony, kinship structures.', suggests_node: 'N10' },
  { key: 'family_addiction',           label: 'Family / community addiction',         category: 'systemic',   case_anchor: 'Ipeelee ¶60', description: 'Substance-use patterns in the family or community of origin.', suggests_node: 'N10' },
  { key: 'community_fragmentation',    label: 'Community fragmentation / violence',   category: 'systemic',   case_anchor: 'Gladue ¶66',  description: 'Violence within the community, fractured kinship and governance.' },
  { key: 'poverty',                    label: 'Poverty / economic marginalisation',   category: 'systemic',   case_anchor: 'Gladue ¶66',  description: 'Material poverty as a systemic outcome of dispossession.' },
  { key: 'dislocation',                label: 'Dislocation / urbanisation',           category: 'systemic',   case_anchor: 'Ipeelee ¶60', description: 'Removal from traditional territory; urbanisation without cultural continuity.' },
  { key: 'discrimination',             label: 'Discrimination experienced',           category: 'systemic',   case_anchor: 'Morris ¶74',  description: 'Lived experience of racism in encounters with state systems.', suggests_node: 'N14' },
  { key: 'education_disruption',       label: 'Education disruption',                 category: 'systemic',   case_anchor: 'Gladue ¶66',  description: 'Interrupted or absent formal education.' },
  { key: 'health_service_gaps',        label: 'Gaps in health / addictions services', category: 'systemic',   case_anchor: 'Ipeelee ¶60', description: 'Lack of culturally appropriate mental health or addictions support.' },

  // ── Individual ──
  { key: 'personal_trauma',            label: 'Personal trauma history',              category: 'individual', case_anchor: 'Ipeelee ¶73', description: 'Direct trauma experience — abuse, witnessing violence, loss.', suggests_node: 'N10' },
  { key: 'mental_health',              label: 'Mental health condition',              category: 'individual', case_anchor: 'Ipeelee ¶73', description: 'Documented or strongly indicated mental health condition.' },
  { key: 'addiction',                  label: 'Substance use / addiction',            category: 'individual', case_anchor: 'Ipeelee ¶73', description: 'Individual addiction pattern; Ipeelee treats it as a moral-culpability factor where rooted in systemic harm.' },
  { key: 'fasd',                       label: 'FASD or cognitive impairment',         category: 'individual', case_anchor: 'Ipeelee ¶73', description: 'Fetal Alcohol Spectrum Disorder or other cognitive impairment.', suggests_node: 'N9' },
  { key: 'attachment_disruption',      label: 'Attachment / placement disruption',    category: 'individual', case_anchor: 'Ipeelee ¶73', description: 'Multiple placements, broken caregiver relationships.', suggests_node: 'N10' },
  { key: 'prior_cfs_contact',          label: 'Prior CFS contact (self)',             category: 'individual', case_anchor: 'Ipeelee ¶73', description: 'The individual was themselves in care.', suggests_node: 'N10' },
  { key: 'intergenerational_survivor', label: 'Intergenerational survivor',           category: 'individual', case_anchor: 'Ipeelee ¶60', description: 'Direct lineal descent from residential school survivors.', suggests_node: 'N10' },

  // ── Sentencing ──
  { key: 'restorative_available',       label: 'Restorative options available',         category: 'sentencing', case_anchor: 'Sharma ¶78',  description: 'Community-based restorative options exist for this client.', suggests_node: 'N12' },
  { key: 'healing_lodge_eligibility',   label: 'Healing lodge eligibility',             category: 'sentencing', case_anchor: 'Ipeelee ¶74', description: 'Eligibility for a CSC healing lodge or s.81 placement.', suggests_node: 'N12' },
  { key: 'community_supervision',       label: 'Community-based supervision capacity',  category: 'sentencing', case_anchor: 'Ipeelee ¶74', description: 'Capacity in the community of origin for culturally relevant supervision.' },
  { key: 'cultural_continuity',         label: 'Cultural continuity at facility',       category: 'sentencing', case_anchor: 'Ipeelee ¶74', description: 'Whether the contemplated facility offers cultural continuity.' },
  { key: 'diminished_culpability',      label: 'Diminished moral culpability',          category: 'sentencing', case_anchor: 'Ipeelee ¶73', description: "Ipeelee's central holding: where systemic factors are causally connected to offending, moral culpability is diminished.", suggests_node: 'N12' },
  { key: 'structural_factors_documented', label: 'Structural factors in record',        category: 'sentencing', case_anchor: 'Sharma ¶78',  description: 'The Gladue/Ipeelee structural analysis is documented in the record.' },
  { key: 'distance_from_community',     label: 'Distance from community in custody',    category: 'sentencing', case_anchor: 'Ipeelee ¶74', description: 'Physical separation from family/community as a placement factor.' },
  { key: 'alternative_to_indeterminate', label: 'Alternative to indeterminate sentence', category: 'sentencing', case_anchor: 'Sharma ¶78', description: 'Existence of a credible Gladue-compliant alternative (LTO + community supervision).', suggests_node: 'N12' },
];

export const GLADUE_FACTORS_BY_KEY: Record<string, GladueFactorMeta> =
  Object.fromEntries(GLADUE_FACTORS.map((f) => [f.key, f]));

export const GLADUE_CATEGORY_LABELS: Record<GladueCategory, string> = {
  systemic:   'Systemic / background factors',
  individual: 'Individual circumstances',
  sentencing: 'Sentencing considerations',
};

export const GLADUE_CATEGORY_ANCHORS: Record<GladueCategory, string> = {
  systemic:   'Gladue ¶66; refined Ipeelee ¶60',
  individual: 'Ipeelee ¶73',
  sentencing: 'Ipeelee ¶74; Sharma ¶78',
};


// ── Types ───────────────────────────────────────────────────────────────────

export interface FactorState {
  ticked: boolean;
  text:   string;
}

export type NarrativeStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface EvidenceSuggestion {
  node:      string;
  value:     number;
  rationale: string;
}

export interface GladueState {
  factor_states:    Record<string, FactorState>;
  narrative:        string | null;
  narrative_status: NarrativeStatus;
  narrative_error:  string | null;
  suggesting:       string | null;  // factor_key currently being drafted (blocking)
}

const DEFAULT_STATE: GladueState = {
  factor_states:    {},
  narrative:        null,
  narrative_status: 'idle',
  narrative_error:  null,
  suggesting:       null,
};


// ── Storage key per case ────────────────────────────────────────────────────

function caseSlug(caseReference: string | null | undefined): string {
  if (!caseReference) return 'unfiled';
  return caseReference
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unfiled';
}

function storageKey(caseReference: string | null | undefined): string {
  return `parvis.mk9.gladue.${caseSlug(caseReference)}`;
}


// ── Evidence suggestions (mirrors backend compute_evidence_suggestions) ─────

export function computeEvidenceSuggestions(
  factor_states: Record<string, FactorState>,
): EvidenceSuggestion[] {
  const ticked = new Set(
    Object.entries(factor_states)
      .filter(([, v]) => v?.ticked)
      .map(([k]) => k),
  );

  const tickedArr = [...ticked];
  const systemicCount   = tickedArr.filter((k) => GLADUE_FACTORS_BY_KEY[k]?.category === 'systemic').length;
  const individualCount = tickedArr.filter((k) => GLADUE_FACTORS_BY_KEY[k]?.category === 'individual').length;
  const sentencingCount = tickedArr.filter((k) => GLADUE_FACTORS_BY_KEY[k]?.category === 'sentencing').length;

  const out: EvidenceSuggestion[] = [];

  if (systemicCount >= 4) {
    out.push({
      node:      'N10',
      value:     0.80,
      rationale: `${systemicCount} systemic Gladue factors ticked. Per Ipeelee ¶60, this engages N10 (intergenerational trauma) at substantive weight.`,
    });
  } else if (systemicCount >= 2 && individualCount >= 1) {
    out.push({
      node:      'N10',
      value:     0.55,
      rationale: `${systemicCount} systemic + ${individualCount} individual factors. Ipeelee's individual-systemic link is engaged at moderate weight.`,
    });
  }

  if (ticked.has('fasd')) {
    out.push({
      node:      'N9',
      value:     0.85,
      rationale: 'FASD factor ticked — engages N9 directly.',
    });
  }

  if (sentencingCount >= 2) {
    out.push({
      node:      'N12',
      value:     0.65,
      rationale: `${sentencingCount} sentencing-side Gladue factors with alternatives identified; failure to weigh them per Sharma ¶78 risks N12 (Gladue misapplication).`,
    });
  }

  return out;
}


// ── Citation marker types (for Piece 4 rendering) ───────────────────────────

export interface CitationPill {
  marker: 'gladue' | 'ipeelee' | 'sharma' | 'morris';
  para:   number;
  label:  string;  // e.g. "Gladue ¶66"
}

const CITATION_LABELS: Record<string, string> = {
  gladue:  'Gladue',
  ipeelee: 'Ipeelee',
  sharma:  'Sharma',
  morris:  'Morris',
};

export function parseCitations(text: string | null): CitationPill[] {
  if (!text) return [];
  const pattern = /\[(gladue|ipeelee|sharma|morris):(\d+)\]/g;
  const seen = new Set<string>();
  const out: CitationPill[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      marker: m[1] as CitationPill['marker'],
      para:   parseInt(m[2], 10),
      label:  `${CITATION_LABELS[m[1]]} ¶${m[2]}`,
    });
  }
  return out;
}


// ── The hook ────────────────────────────────────────────────────────────────

export function useGladue(caseReference: string | null | undefined) {
  const [state,    setState]    = useState<GladueState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const key = storageKey(caseReference);

  // Hydrate from localStorage on case change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHydrated(false);
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          factor_states:    parsed.factor_states || {},
          narrative:        parsed.narrative     || null,
          narrative_status: parsed.narrative_status === 'streaming' ? 'idle' : (parsed.narrative_status || 'idle'),
          narrative_error:  null,
          suggesting:       null,
        });
      } else {
        setState(DEFAULT_STATE);
      }
    } catch {
      setState(DEFAULT_STATE);
    }
    setHydrated(true);
  }, [key]);

  // Persist factor_states + narrative on change (skip transient stream state)
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        factor_states:    state.factor_states,
        narrative:        state.narrative,
        narrative_status: state.narrative_status === 'streaming' ? 'idle' : state.narrative_status,
      }));
    } catch { /* quota or serialisation failure — drop silently */ }
  }, [state.factor_states, state.narrative, state.narrative_status, key, hydrated]);


  // ── Mutations ────────────────────────────────────────────────────────────

  const toggle = useCallback((factorKey: string) => {
    setState((prev) => ({
      ...prev,
      factor_states: {
        ...prev.factor_states,
        [factorKey]: {
          ticked: !prev.factor_states[factorKey]?.ticked,
          text:   prev.factor_states[factorKey]?.text || '',
        },
      },
    }));
  }, []);

  const setText = useCallback((factorKey: string, text: string) => {
    setState((prev) => ({
      ...prev,
      factor_states: {
        ...prev.factor_states,
        [factorKey]: {
          ticked: prev.factor_states[factorKey]?.ticked || false,
          text,
        },
      },
    }));
  }, []);

  const clearNarrative = useCallback(() => {
    setState((prev) => ({
      ...prev,
      narrative:        null,
      narrative_status: 'idle',
      narrative_error:  null,
    }));
  }, []);

  const clearAll = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(DEFAULT_STATE);
  }, []);


  // ── LLM calls ────────────────────────────────────────────────────────────

  const suggestText = useCallback(async (
    factorKey:       string,
    profile:         Record<string, any>,
    intakeExtracted: Record<string, any>,
  ): Promise<void> => {
    if (!caseReference) return;
    if (state.suggesting) return;  // one at a time

    const apiKeyInfo = readApiKeySync();
    setState((prev) => ({ ...prev, suggesting: factorKey }));

    try {
      const resp = await fetch('http://localhost:8000/api/v1/gladue/suggest_factor_text', {
        method: 'POST',
        headers: {
          'Content-Type':          'application/json',
          'X-Parvis-Api-Key':      apiKeyInfo?.key || '',
          'X-Parvis-Api-Provider': apiKeyInfo?.provider || 'anthropic',
        },
        body: JSON.stringify({
          case_reference:   caseReference,
          factor_key:       factorKey,
          profile,
          intake_extracted: intakeExtracted,
          prior_text:       state.factor_states[factorKey]?.text || null,
        }),
      });

      if (!resp.ok) throw new Error(`Backend ${resp.status}`);
      const data = await resp.json();

      if (data.status === 'ok' && data.text) {
        setState((prev) => ({
          ...prev,
          suggesting: null,
          factor_states: {
            ...prev.factor_states,
            [factorKey]: {
              ticked: true,  // suggesting auto-ticks
              text:   data.text,
            },
          },
        }));
      } else {
        // Surface no_key / error gracefully — leave text empty
        setState((prev) => ({ ...prev, suggesting: null }));
      }
    } catch {
      setState((prev) => ({ ...prev, suggesting: null }));
    }
  }, [caseReference, state.suggesting, state.factor_states]);


  const generateNarrative = useCallback(async (
    profile:         Record<string, any>,
    intakeExtracted: Record<string, any>,
  ): Promise<void> => {
    if (!caseReference) return;
    if (state.narrative_status === 'streaming') return;  // already running

    // Cancel any prior request (defensive)
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const apiKeyInfo = readApiKeySync();

    setState((prev) => ({
      ...prev,
      narrative:        '',
      narrative_status: 'streaming',
      narrative_error:  null,
    }));

    try {
      const resp = await fetch('http://localhost:8000/api/v1/gladue/generate_narrative', {
        method:  'POST',
        signal:  abortRef.current.signal,
        headers: {
          'Content-Type':          'application/json',
          'X-Parvis-Api-Key':      apiKeyInfo?.key || '',
          'X-Parvis-Api-Provider': apiKeyInfo?.provider || 'anthropic',
        },
        body: JSON.stringify({
          case_reference:   caseReference,
          profile,
          intake_extracted: intakeExtracted,
          factor_states:    state.factor_states,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`Backend ${resp.status}`);

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let   accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setState((prev) => ({ ...prev, narrative: accumulated }));
      }

      const tail = decoder.decode();
      if (tail) accumulated += tail;

      setState((prev) => ({
        ...prev,
        narrative:        accumulated,
        narrative_status: 'done',
      }));
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setState((prev) => ({ ...prev, narrative_status: 'idle' }));
        return;
      }
      setState((prev) => ({
        ...prev,
        narrative_status: 'error',
        narrative_error:  err?.message || String(err),
      }));
    } finally {
      abortRef.current = null;
    }
  }, [caseReference, state.narrative_status, state.factor_states]);


  // ── Derived ──────────────────────────────────────────────────────────────

  const evidenceSuggestions = useMemo(
    () => computeEvidenceSuggestions(state.factor_states),
    [state.factor_states],
  );

  const tickedCount = useMemo(
    () => Object.values(state.factor_states).filter((s) => s.ticked).length,
    [state.factor_states],
  );

  const citations = useMemo(
    () => parseCitations(state.narrative),
    [state.narrative],
  );


  return {
    state,
    hydrated,
    tickedCount,
    evidenceSuggestions,
    citations,
    toggle,
    setText,
    suggestText,
    generateNarrative,
    clearNarrative,
    clearAll,
  };
}
