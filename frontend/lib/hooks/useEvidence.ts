'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { runSoftInference, type InferenceResponse } from '@/lib/api';

/**
 * Per-node evidence state.
 *
 *   value:   0 (absent) | 1 (present)  — the hard observation
 *   slider:  P(node = true) ∈ [0, 1]   — the confidence reading
 *
 * The toggle and slider are kept in sync: flipping the toggle snaps the
 * slider to the engine's neutral for that side (0.15 for absent, 0.85
 * for present). Dragging the slider past 0.5 flips the toggle.
 *
 * The shift sent to the backend is (slider - 0.5) for nodes the user
 * has touched, clipped to [-0.45, 0.45]. Untouched nodes contribute
 * neither evidence nor shift — they remain marginalised by VE.
 */
export interface EvidenceEntry {
  value:   0 | 1;
  slider:  number;
}

export type EvidenceState = Record<string, EvidenceEntry>;


// ── Default evidence — anonymised demo from the redesign mocks ───────────────

const DEMO_EVIDENCE: EvidenceState = {
  '5':  { value: 1, slider: 0.85 },
  '6':  { value: 1, slider: 0.85 },
  '7':  { value: 1, slider: 0.85 },
  '8':  { value: 1, slider: 0.85 },
  '9':  { value: 1, slider: 0.85 },
  '17': { value: 1, slider: 0.85 },
};


// ── Debounce hook ────────────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}


// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseEvidenceResult {
  evidence:    EvidenceState;
  toggle:      (nodeId: string) => void;
  setSlider:   (nodeId: string, value: number) => void;
  clear:       (nodeId: string) => void;
  reset:       () => void;
  inference:   InferenceResponse | undefined;
  isLoading:   boolean;
  error:       Error | null;
}

/**
 * Owns the practitioner's per-node evidence + slider state and runs
 * soft-inference whenever the *debounced* state changes. Toggles propagate
 * instantly; slider drags debounce 150ms so the backend isn't hammered
 * during a drag gesture.
 *
 * Posterior responses are cached in React Query under
 * ['posterior', 'risk-distortions'] — distinct from the Overview's
 * ['posterior', 'demo-case'] key so the two screens don't fight.
 */
export function useEvidence(): UseEvidenceResult {
  const [evidence, setEvidence] = useState<EvidenceState>(DEMO_EVIDENCE);
  const debouncedEvidence = useDebouncedValue(evidence, 150);
  const qc = useQueryClient();

  // Build the request body from the (debounced) state.
  const requestBody = useMemo(() => {
    const hard: Record<string, 0 | 1> = {};
    const shifts: Record<string, number> = {};
    for (const [nid, entry] of Object.entries(debouncedEvidence)) {
      hard[nid] = entry.value;
      // The "neutral" slider position is 0.85 if value=1, 0.15 if value=0.
      // Deviation from neutral becomes the post-VE shift.
      const neutral = entry.value === 1 ? 0.85 : 0.15;
      const shift = entry.slider - neutral;
      if (Math.abs(shift) > 0.001) {
        shifts[nid] = Math.max(-0.45, Math.min(0.45, shift));
      }
    }
    return { evidence: hard, shifts };
  }, [debouncedEvidence]);

  const query = useQuery({
    queryKey: ['posterior', 'risk-distortions', requestBody],
    queryFn:  () => runSoftInference(requestBody),
    staleTime: 60_000,
  });

  // Mirror the latest posterior to a shared key so the TopBar and
  // LivePosteriorRail reflect the user's current evidence without owning
  // the toggle state themselves. This is the single source of truth for
  // 'what posterior does the case currently have?'.
  useEffect(() => {
    if (query.data) {
      qc.setQueryData(['posterior', 'current'], query.data);
    }
  }, [query.data, qc]);

  function toggle(nodeId: string) {
    setEvidence((prev) => {
      const current = prev[nodeId];
      if (!current) {
        return { ...prev, [nodeId]: { value: 1, slider: 0.85 } };
      }
      const flipped: 0 | 1 = current.value === 1 ? 0 : 1;
      return { ...prev, [nodeId]: { value: flipped, slider: flipped === 1 ? 0.85 : 0.15 } };
    });
  }

  function setSlider(nodeId: string, value: number) {
    setEvidence((prev) => {
      const flipped: 0 | 1 = value >= 0.5 ? 1 : 0;
      return { ...prev, [nodeId]: { value: flipped, slider: value } };
    });
  }

  function clear(nodeId: string) {
    setEvidence((prev) => {
      const { [nodeId]: _, ...rest } = prev;
      return rest;
    });
  }

  function reset() {
    setEvidence(DEMO_EVIDENCE);
    qc.invalidateQueries({ queryKey: ['posterior', 'risk-distortions'] });
  }

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