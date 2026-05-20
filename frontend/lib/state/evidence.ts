'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface EvidenceEntry {
  value:  0 | 1;
  slider: number;
}

export type EvidenceState = Record<string, EvidenceEntry>;

const DEMO_EVIDENCE: EvidenceState = {
  '5':  { value: 1, slider: 0.85 },
  '6':  { value: 1, slider: 0.85 },
  '7':  { value: 1, slider: 0.85 },
  '8':  { value: 1, slider: 0.85 },
  '9':  { value: 1, slider: 0.85 },
  '17': { value: 1, slider: 0.85 },
};

interface EvidenceStore {
  evidence:  EvidenceState;
  toggle:    (nodeId: string) => void;
  setSlider: (nodeId: string, value: number) => void;
  clear:     (nodeId: string) => void;
  setEntry:  (nodeId: string, entry: EvidenceEntry) => void;
  bulkApply: (entries: EvidenceState) => void;
  reset:     () => void;
}

export const useEvidenceStore = create<EvidenceStore>()(
  persist(
    (set) => ({
      evidence: DEMO_EVIDENCE,

      toggle: (nodeId) => set((s) => {
        const current = s.evidence[nodeId];
        if (!current) {
          return { evidence: { ...s.evidence, [nodeId]: { value: 1, slider: 0.85 } } };
        }
        const flipped: 0 | 1 = current.value === 1 ? 0 : 1;
        return {
          evidence: {
            ...s.evidence,
            [nodeId]: { value: flipped, slider: flipped === 1 ? 0.85 : 0.15 },
          },
        };
      }),

      setSlider: (nodeId, value) => set((s) => {
        const flipped: 0 | 1 = value >= 0.5 ? 1 : 0;
        return {
          evidence: { ...s.evidence, [nodeId]: { value: flipped, slider: value } },
        };
      }),

      clear: (nodeId) => set((s) => {
        const next = { ...s.evidence };
        delete next[nodeId];
        return { evidence: next };
      }),

      setEntry: (nodeId, entry) => set((s) => ({
        evidence: { ...s.evidence, [nodeId]: entry },
      })),

      bulkApply: (entries) => set((s) => ({
        evidence: { ...s.evidence, ...entries },
      })),

      reset: () => set({ evidence: DEMO_EVIDENCE }),
    }),
    {
      name:    'parvis.mk9.evidence',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
