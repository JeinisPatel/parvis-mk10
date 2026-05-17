'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyseRecord, type Conviction, type RecordAnalysisResponse } from '@/lib/api';

/**
 * Criminal record state — list of convictions persisted to localStorage,
 * plus a live analysis from the backend.
 *
 * Storage: localStorage under RECORD_KEY. Phase A.5 swaps for Supabase.
 *
 * The list of convictions is the authoritative state; the analysis is a
 * derived view fetched whenever the list changes.
 */

const RECORD_KEY = 'parvis.mk9.record';


function blankConviction(): Conviction {
  return {
    id:                       `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    charge:                   '',
    category:                 'other',
    year:                     null,
    jurisdiction:             '',
    sentence_type:            'other',
    sentence_length_months:   null,
    bail_denied:              false,
    counsel_inadequate:       false,
    overpoliced_jurisdiction: false,
    plea_under_pressure:      false,
    notes:                    '',
  };
}


export function useRecord() {
  const [convictions, setConvictions] = useState<Conviction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECORD_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Conviction[];
        if (Array.isArray(parsed)) setConvictions(parsed);
      }
    } catch { /* silent fallback */ }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(RECORD_KEY, JSON.stringify(convictions));
    } catch { /* quota error: silent */ }
  }, [convictions, hydrated]);

  // Live analysis — re-runs whenever the conviction list changes.
  const analysis = useQuery({
    queryKey: ['record-analysis', convictions],
    queryFn:  () => analyseRecord(convictions),
    staleTime: 30_000,
    enabled: hydrated,
  });

  const addConviction = useCallback(() => {
    setConvictions((prev) => [...prev, blankConviction()]);
  }, []);

  const updateConviction = useCallback(
    <K extends keyof Conviction>(id: string, field: K, value: Conviction[K]) => {
      setConvictions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
      );
    },
    [],
  );

  const removeConviction = useCallback((id: string) => {
    setConvictions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setConvictions([]);
  }, []);

  return {
    convictions,
    addConviction,
    updateConviction,
    removeConviction,
    clearAll,
    analysis: analysis.data,
    isLoadingAnalysis: analysis.isLoading,
    analysisError: (analysis.error as Error | null) ?? null,
    hydrated,
  };
}


/**
 * Static read for components that need the record but don't want to subscribe.
 * Returns the empty array on server or when no record is saved yet.
 */
export function readRecordSync(): Conviction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECORD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}


/**
 * Push the record's strong doctrinal implications into the Risk & distortions
 * evidence state. This is the explicit "apply to evidence" bridge.
 *
 * Reads the current evidence (stored under the Risk & distortions key by
 * useEvidence) and overlays nodes flagged as 'strong' in the analysis with
 * a "present, high confidence" entry. Advisory implications are not auto-
 * applied — the practitioner must reach the Risk & distortions screen to
 * engage them deliberately.
 */
export function applyRecordToEvidence(implications: { node: string; type: string }[]): void {
  if (typeof window === 'undefined') return;
  const EVIDENCE_KEY = 'parvis.mk9.evidence';  // matches useEvidence's storage convention

  let current: Record<string, { value: 0 | 1; slider: number }> = {};
  try {
    const raw = window.localStorage.getItem(EVIDENCE_KEY);
    if (raw) current = JSON.parse(raw);
  } catch { /* silent */ }

  for (const imp of implications) {
    if (imp.type === 'strong') {
      current[imp.node] = { value: 1, slider: 0.85 };
    }
  }

  try {
    window.localStorage.setItem(EVIDENCE_KEY, JSON.stringify(current));
    // Notify subscribers in this tab — useEvidence polls localStorage but
    // dispatching the storage event also triggers cross-tab updates.
    window.dispatchEvent(new StorageEvent('storage', { key: EVIDENCE_KEY }));
  } catch { /* silent */ }
}