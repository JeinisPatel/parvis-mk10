'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { runSoftInference, type InferenceResponse } from '@/lib/api';
import { useEvidenceStore, type EvidenceState, type EvidenceEntry } from '@/lib/state/evidence';

// Re-export so existing imports of EvidenceState / EvidenceEntry still resolve.
export type { EvidenceState, EvidenceEntry };

/** Debounce a value by `delay` ms so slider drags don't hammer the backend. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export interface UseEvidenceResult {
  evidence:  EvidenceState;
  toggle:    (nodeId: string) => void;
  setSlider: (nodeId: string, value: number) => void;
  clear:     (nodeId: string) => void;
  reset:     () => void;
  inference: InferenceResponse | undefined;
  isLoading: boolean;
  error:     Error | null;
}

/**
 * useEvidence — reads the practitioner's per-node evidence from the global
 * Zustand store (lib/state/evidence.ts) and runs soft-inference whenever
 * the debounced state changes. Toggles propagate instantly; slider drags
 * debounce 150ms so the backend isn't hammered during a drag gesture.
 *
 * Posterior responses are cached under ['posterior', 'current'] — the
 * same key the Case Overview reads from, so they update in lockstep.
 */
export function useEvidence(): UseEvidenceResult {
  const evidence  = useEvidenceStore((s) => s.evidence);
  const toggle    = useEvidenceStore((s) => s.toggle);
  const setSlider = useEvidenceStore((s) => s.setSlider);
  const clear     = useEvidenceStore((s) => s.clear);
  const reset     = useEvidenceStore((s) => s.reset);
  const qc        = useQueryClient();

  const debouncedEvidence = useDebouncedValue(evidence, 150);

  // Build the request body from the (debounced) state.
  const requestBody = useMemo(() => {
    const hard:   Record<string, 0 | 1>  = {};
    const shifts: Record<string, number> = {};
    for (const [nid, entry] of Object.entries(debouncedEvidence)) {
      hard[nid] = entry.value;
      const neutral = entry.value === 1 ? 0.85 : 0.15;
      const shift   = entry.slider - neutral;
      if (Math.abs(shift) > 0.001) {
        shifts[nid] = Math.max(-0.45, Math.min(0.45, shift));
      }
    }
    return { evidence: hard, shifts };
  }, [debouncedEvidence]);

  const query = useQuery({
    queryKey:  ['posterior', 'current', requestBody],
    queryFn:   () => runSoftInference(requestBody),
    staleTime: 60_000,
  });

  // Mirror the latest posterior into the canonical 'current' key so any
  // component that queries ['posterior', 'current'] reads fresh data.
  useEffect(() => {
    if (query.data) {
      qc.setQueryData(['posterior', 'current'], query.data);
    }
  }, [query.data, qc]);

  return {
    evidence,
    toggle,
    setSlider,
    clear,
    reset,
    inference: query.data,
    isLoading: query.isLoading,
    error:     (query.error as Error | null) ?? null,
  };
}
