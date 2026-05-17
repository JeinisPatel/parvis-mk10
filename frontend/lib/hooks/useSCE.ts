'use client';

/**
 * useSCE — Social Context Evidence (SCE) screen hook
 *
 * Manages per-case SCE factor state, per-factor narrative drafting, and
 * full streaming narrative generation. Mirrors the backend
 * parvis_engine/_sce_factors.py module: the FACTORS list and the
 * evidence-suggestion thresholds are duplicated here so the screen renders
 * without a backend round-trip per interaction. The LLM-touched paths
 * (suggestText, generateNarrative) go to the backend.
 *
 * Persistence: localStorage key `parvis.mk9.sce.{caseSlug}`.
 * Streaming:   generateNarrative consumes a text/plain ReadableStream
 *              and appends chunks to state.narrative as they arrive.
 *
 * Architectural sibling of useGladue. Only content (factors, categories,
 * threshold logic, citation marker set) differs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readApiKeySync } from './useApiKey';


// ── Factor metadata (mirrors backend _sce_factors.py) ───────────────────────

export type SCECategory = 'evidence_types' | 'systemic_patterns' | 'sentencing_implications';

export interface SCEFactorMeta {
  key:           string;
  label:         string;
  category:      SCECategory;
  case_anchor:   string;
  description:   string;
  suggests_node?: string;
}

export const SCE_FACTORS: ReadonlyArray<SCEFactorMeta> = [
  // ── Evidence types ──
  { key: 'irca_commissioned',              label: 'IRCA commissioned',                          category: 'evidence_types', case_anchor: 'Anderson ¶119', description: 'Impact of Race and Culture Assessment commissioned for this client. The signature procedural mechanism endorsed by Anderson.' },
  { key: 'expert_sociological',            label: 'Expert sociological / historical report',    category: 'evidence_types', case_anchor: 'Morris ¶74',    description: "Academic expert evidence on the relevant community's history and structural conditions." },
  { key: 'expert_mental_health_cultural',  label: 'Culturally-competent mental health report',  category: 'evidence_types', case_anchor: 'Morris ¶74',    description: 'Expert mental-health report attentive to how cultural, racial, or immigration trauma manifests.' },
  { key: 'statistical_structural',         label: 'Statistical / structural evidence',          category: 'evidence_types', case_anchor: 'Morris ¶85',    description: 'Sentencing disparities, incarceration rates, stop-and-search data. Morris ¶85 admits judicial notice for established patterns.' },
  { key: 'community_impact',               label: 'Community impact statements / affidavits',   category: 'evidence_types', case_anchor: 'Morris ¶82',    description: "Affidavit evidence from community members contextualising the offence and the accused's place in the community." },
  { key: 'defendant_evidence',             label: "Defendant's own evidence / affidavit",       category: 'evidence_types', case_anchor: 'Morris ¶82',    description: "The accused's own testimony or affidavit on pathway and the role of systemic factors." },
  { key: 'documentary_records',            label: 'Documentary records (school / employment / medical)', category: 'evidence_types', case_anchor: 'Morris ¶74', description: 'Records showing systemic factors as lived — interrupted schooling, employment discrimination, medical gaps, housing instability.' },

  // ── Systemic patterns ──
  { key: 'anti_black_racism',              label: 'Anti-Black racism documented in record',     category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: "Morris's original factual context: anti-Black racism in policing, prosecution, and sentencing in the relevant jurisdiction.", suggests_node: 'N14' },
  { key: 'over_policing_documented',       label: 'Over-policing in jurisdiction',              category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: 'Statistical or testimonial evidence of disproportionate police contact with the relevant demographic.', suggests_node: 'N14' },
  { key: 'sentencing_disparities',         label: 'Sentencing disparities for demographic',     category: 'systemic_patterns', case_anchor: 'Morris ¶85',    description: 'Established sentencing-outcome disparities. Morris ¶85 admits judicial notice for well-documented patterns.', suggests_node: 'N16' },
  { key: 'intergenerational_displacement', label: 'Intergenerational slavery / segregation',    category: 'systemic_patterns', case_anchor: 'Anderson ¶119', description: 'Anderson context for African Nova Scotian and other Black communities with intergenerational effects of slavery, displacement, segregation.' },
  { key: 'educational_discrimination',     label: 'Educational discrimination experienced',     category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: 'Documented school-level discrimination, disciplinary disparities, or streaming away from academic tracks.' },
  { key: 'housing_segregation',            label: 'Housing discrimination / segregation',       category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: 'Structural housing instability or discrimination affecting the accused or their community.' },
  { key: 'mental_health_service_gaps',     label: 'Mental health service gaps for community',   category: 'systemic_patterns', case_anchor: 'Ellis',         description: 'Absence of culturally competent mental-health or addictions services in the community at the relevant time.' },
  { key: 'refugee_immigration_trauma',     label: 'Refugee / immigration trauma',               category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: 'Forced migration, refugee processing trauma, family separation in immigration context.' },
  { key: 'anti_asian_racism',              label: 'Anti-Asian racism / hate-crime climate',     category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: 'Post-2020 application of Morris methodology to anti-Asian violence and hate-crime climate.' },
  { key: 'economic_marginalisation',       label: 'Economic marginalisation (systemic)',        category: 'systemic_patterns', case_anchor: 'Morris ¶74',    description: 'Employment discrimination, wage gaps, exclusion from economic opportunity as structural facts traceable to racialised patterns.' },
  { key: 'specific_historical_event',      label: 'Specific historical injustice',              category: 'systemic_patterns', case_anchor: 'Anderson ¶119', description: 'Identifiable historical injustice with documented intergenerational effects (Africville, internment, Komagata Maru, etc.).' },

  // ── Sentencing implications ──
  { key: 'diminished_moral_culpability_charter', label: 'Diminished moral culpability (Charter s.15)', category: 'sentencing_implications', case_anchor: 'Morris ¶74',  description: "Where systemic factors are causally connected to offending, moral culpability is diminished — Morris's central proposition, constitutional anchor in Sharma ¶78." },
  { key: 'incarceration_inappropriate',          label: 'Incarceration inappropriate here',            category: 'sentencing_implications', case_anchor: 'Morris ¶74',  description: 'Where SCE is properly weighed, a custodial disposition is not the proportionate response.' },
  { key: 'community_supervision_feasible',       label: 'Community-based supervision feasible',        category: 'sentencing_implications', case_anchor: 'Ellis',       description: "Concrete supervision capacity exists in the accused's community of origin or current residence." },
  { key: 'restorative_available',                label: 'Restorative justice options available',       category: 'sentencing_implications', case_anchor: 'Morris ¶74',  description: 'Community-based restorative or circle-style processes available and appropriate for this offence.' },
  { key: 'mandatory_minimum_analysis',           label: 'Mandatory minimum constitutional analysis',   category: 'sentencing_implications', case_anchor: 'Sharma ¶78',  description: 'Where a mandatory minimum applies, the SCE evidence engages the constitutional analysis Sharma reaffirms.' },
  { key: 'risk_recalibration_needed',            label: 'Risk assessment recalibration needed',        category: 'sentencing_implications', case_anchor: 'Morris ¶85',  description: 'Standard actuarial instruments may compound rather than correct for SCE. Recalibration or culturally-informed interpretation required.', suggests_node: 'N17' },
  { key: 'crown_disclosure_structural',          label: 'Crown disclosure on structural data',         category: 'sentencing_implications', case_anchor: 'Morris ¶82',  description: 'Crown disclosure obligation extends to internal data on charging, prosecution, and sentencing patterns where relevant to SCE.' },
  { key: 'cultural_fit_facility',                label: 'Cultural-fit programs at facility',           category: 'sentencing_implications', case_anchor: 'Ellis',       description: "If incarceration is imposed, programs and supports appropriate to the accused's community must be available." },
];

export const SCE_FACTORS_BY_KEY: Record<string, SCEFactorMeta> =
  Object.fromEntries(SCE_FACTORS.map((f) => [f.key, f]));

export const SCE_CATEGORY_LABELS: Record<SCECategory, string> = {
  evidence_types:          'Evidence types marshalled',
  systemic_patterns:       'Systemic patterns established',
  sentencing_implications: 'Sentencing implications',
};

export const SCE_CATEGORY_ANCHORS: Record<SCECategory, string> = {
  evidence_types:          'Morris ¶74, ¶82; Anderson ¶119',
  systemic_patterns:       'Morris ¶74, ¶85; Anderson ¶119',
  sentencing_implications: 'Morris ¶74; Sharma ¶78',
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

export interface SCEState {
  factor_states:    Record<string, FactorState>;
  narrative:        string | null;
  narrative_status: NarrativeStatus;
  narrative_error:  string | null;
  suggesting:       string | null;
}

const DEFAULT_STATE: SCEState = {
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
  return `parvis.mk9.sce.${caseSlug(caseReference)}`;
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
  const evidenceCount = tickedArr.filter(
    (k) => SCE_FACTORS_BY_KEY[k]?.category === 'evidence_types',
  ).length;
  const systemicCount = tickedArr.filter(
    (k) => SCE_FACTORS_BY_KEY[k]?.category === 'systemic_patterns',
  ).length;

  const out: EvidenceSuggestion[] = [];

  // N14 (over-policing)
  if (ticked.has('over_policing_documented') || ticked.has('anti_black_racism')) {
    out.push({
      node:      'N14',
      value:     0.75,
      rationale: 'Over-policing or anti-Black racism in record per Morris ¶74 engages N14 (over-policing distortion) at substantive weight.',
    });
  } else if (systemicCount >= 3 && evidenceCount >= 2) {
    out.push({
      node:      'N14',
      value:     0.55,
      rationale: `${systemicCount} systemic patterns ticked with ${evidenceCount} evidence types marshalled — Morris methodological framework engages N14 at moderate weight.`,
    });
  }

  // N16 (tariff disparities — derived)
  if (ticked.has('sentencing_disparities')) {
    out.push({
      node:      'N16',
      value:     0.70,
      rationale: 'Sentencing disparities established under Morris ¶85 engages N16 (tariff disparities, derived).',
    });
  } else if (systemicCount >= 4) {
    out.push({
      node:      'N16',
      value:     0.55,
      rationale: `${systemicCount} systemic patterns established — structural disparities downstream of Morris methodology engage N16 at moderate weight.`,
    });
  }

  // N17 (collider bias — derived)
  if (ticked.has('risk_recalibration_needed')) {
    out.push({
      node:      'N17',
      value:     0.60,
      rationale: 'Risk-recalibration argued under Morris ¶85 engages N17 (collider bias) directly.',
    });
  }

  return out;
}


// ── Citation marker types (extended set: 6 markers) ─────────────────────────

export type CitationMarker = 'gladue' | 'ipeelee' | 'sharma' | 'morris' | 'anderson' | 'ellis';

export interface CitationPill {
  marker: CitationMarker;
  para:   number | null;  // null when no paragraph specified (e.g. generic 'Ellis')
  label:  string;
}

const CITATION_LABELS: Record<CitationMarker, string> = {
  gladue:   'Gladue',
  ipeelee:  'Ipeelee',
  sharma:   'Sharma',
  morris:   'Morris',
  anderson: 'Anderson',
  ellis:    'Ellis',
};

export function parseCitations(text: string | null): CitationPill[] {
  if (!text) return [];
  // Accept either [marker:N] or generic [ellis:N] where N may be the literal 'N'
  const pattern = /\[(gladue|ipeelee|sharma|morris|anderson|ellis):([^\]]+)\]/g;
  const seen = new Set<string>();
  const out: CitationPill[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const marker = m[1] as CitationMarker;
    const paraRaw = m[2];
    const para = /^\d+$/.test(paraRaw) ? parseInt(paraRaw, 10) : null;
    const seenKey = `${marker}:${para ?? 'gen'}`;
    if (seen.has(seenKey)) continue;
    seen.add(seenKey);
    out.push({
      marker,
      para,
      label: para != null
        ? `${CITATION_LABELS[marker]} ¶${para}`
        : CITATION_LABELS[marker],
    });
  }
  return out;
}


// ── The hook ────────────────────────────────────────────────────────────────

export function useSCE(caseReference: string | null | undefined) {
  const [state,    setState]    = useState<SCEState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const key = storageKey(caseReference);

  // Hydrate on case change
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

  // Persist non-transient state
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        factor_states:    state.factor_states,
        narrative:        state.narrative,
        narrative_status: state.narrative_status === 'streaming' ? 'idle' : state.narrative_status,
      }));
    } catch { /* drop silently on quota or serialisation failure */ }
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
    if (state.suggesting) return;

    const apiKeyInfo = readApiKeySync();
    setState((prev) => ({ ...prev, suggesting: factorKey }));

    try {
      const resp = await fetch('http://localhost:8000/api/v1/sce/suggest_factor_text', {
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
              ticked: true,
              text:   data.text,
            },
          },
        }));
      } else {
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
    if (state.narrative_status === 'streaming') return;

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
      const resp = await fetch('http://localhost:8000/api/v1/sce/generate_narrative', {
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
