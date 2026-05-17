'use client';

/**
 * useScenarios — multi-profile comparison hook
 *
 * A "scenario" is a versioned snapshot of the full case state at a point
 * in time:
 *   - profile          (from useProfile, passed in by page)
 *   - evidence         (from useEvidence, passed in by page)
 *   - inference        (the computed Bayesian posterior at snapshot time)
 *   - gladue           (case-scoped, read from localStorage at save time)
 *   - sce              (case-scoped, read from localStorage at save time)
 *   - chatExtracted    (case-scoped, structured intake state)
 *   - documentRefs     (case-scoped, document IDs + names for reference)
 *
 * Persistence: localStorage key `parvis.mk9.scenarios.{caseSlug}` —
 * scenarios are case-scoped so switching cases shows the right set.
 *
 * Restore writes the snapshot back to the relevant localStorage keys
 * and triggers `window.location.reload()` so every state hook
 * re-hydrates from the restored data. The page is responsible for any
 * "save current first?" confirmation flow before calling restore.
 */

import { useCallback, useEffect, useState } from 'react';


// ── Types ───────────────────────────────────────────────────────────────────

export interface ScenarioSnapshot {
  schemaVersion: 1;
  capturedAt:    string;   // ISO timestamp
  caseReference: string;
  caseSlug:      string;

  // Live state captured at save time (passed in by the page)
  profile:       Record<string, any>;
  evidence:      Record<string, any>;
  inference:     any | null;

  // Case-scoped state captured from localStorage at save time
  gladue:        any | null;
  sce:           any | null;
  chatExtracted: Record<string, any> | null;
  documentRefs:  { id: string; name: string }[] | null;
}

export interface SavedScenario {
  id:       string;
  name:     string;
  snapshot: ScenarioSnapshot;
}


// ── Helpers ─────────────────────────────────────────────────────────────────

function caseSlug(ref: string | null | undefined): string {
  if (!ref) return 'unfiled';
  return ref
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unfiled';
}

function storageKey(caseRef: string | null | undefined): string {
  return `parvis.mk9.scenarios.${caseSlug(caseRef)}`;
}

function readJSON<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function generateId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


// ── The hook ────────────────────────────────────────────────────────────────

export interface LiveStateForSave {
  profile:       Record<string, any>;
  evidence:      Record<string, any>;
  inference:     any | null;
  documentRefs?: { id: string; name: string }[];
}

export function useScenarios(caseReference: string | null | undefined) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const key  = storageKey(caseReference);
  const slug = caseSlug(caseReference);

  // Hydrate on case change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHydrated(false);
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      setScenarios(Array.isArray(parsed) ? parsed : []);
    } catch {
      setScenarios([]);
    }
    setHydrated(true);
  }, [key]);

  // Persist on change
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(scenarios));
    } catch {
      /* quota / serialisation failure — drop silently */
    }
  }, [scenarios, key, hydrated]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const save = useCallback(
    (name: string, livestate: LiveStateForSave): SavedScenario => {
      const ref = caseReference || 'Unfiled';

      const gladue = readJSON(`parvis.mk9.gladue.${slug}`);
      const sce    = readJSON(`parvis.mk9.sce.${slug}`);
      const chat   = readJSON<{ extracted?: Record<string, any> }>(
        `parvis.mk9.chat.${slug}`,
      );

      const snapshot: ScenarioSnapshot = {
        schemaVersion: 1,
        capturedAt:    new Date().toISOString(),
        caseReference: ref,
        caseSlug:      slug,
        profile:       { ...livestate.profile },
        evidence:      JSON.parse(JSON.stringify(livestate.evidence || {})),
        inference:     livestate.inference
          ? JSON.parse(JSON.stringify(livestate.inference))
          : null,
        gladue,
        sce,
        chatExtracted: chat?.extracted || null,
        documentRefs:  livestate.documentRefs || null,
      };

      const newScenario: SavedScenario = {
        id:       generateId(),
        name:     name.trim() || `Scenario ${scenarios.length + 1}`,
        snapshot,
      };

      setScenarios((prev) => [...prev, newScenario]);
      return newScenario;
    },
    [caseReference, slug, scenarios.length],
  );

  const rename = useCallback((id: string, newName: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName.trim() || s.name } : s)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setScenarios([]);
  }, []);

  /**
   * Restore writes the snapshot back to live state via localStorage
   * and reloads the window so every hook re-hydrates.
   * The page is responsible for any "save current first?" UX before
   * calling this.
   */
  const restore = useCallback(
    (id: string) => {
      const scenario = scenarios.find((s) => s.id === id);
      if (!scenario || typeof window === 'undefined') return;

      const snap = scenario.snapshot;

      try {
        // Global state
        window.localStorage.setItem(
          'parvis.mk9.profile',
          JSON.stringify(snap.profile),
        );
        window.localStorage.setItem(
          'parvis.mk9.evidence',
          JSON.stringify(snap.evidence),
        );

        // Case-scoped state — write under the SNAPSHOT's caseSlug so the
        // restored case identity is preserved even if you've since
        // edited the case reference.
        if (snap.gladue) {
          window.localStorage.setItem(
            `parvis.mk9.gladue.${snap.caseSlug}`,
            JSON.stringify(snap.gladue),
          );
        }
        if (snap.sce) {
          window.localStorage.setItem(
            `parvis.mk9.sce.${snap.caseSlug}`,
            JSON.stringify(snap.sce),
          );
        }

        // Re-hydrate everything
        window.location.reload();
      } catch (err) {
        console.error('Failed to restore scenario:', err);
      }
    },
    [scenarios],
  );

  return {
    scenarios,
    hydrated,
    save,
    rename,
    remove,
    clearAll,
    restore,
  };
}


// ── Comparison utilities ────────────────────────────────────────────────────

/**
 * Extract the DO-designation posterior from an inference response.
 * Defensive — handles several common shapes since the engine's inference
 * payload shape can vary.
 */
export function extractDoRisk(inference: any | null): number | null {
  if (!inference) return null;

  const candidates = [
    inference?.do_risk,
    inference?.posterior,
    inference?.posteriors?.['20'],
    inference?.posteriors?.['N20'],
    inference?.posteriors?.[20],
    inference?.do_designation_risk,
    inference?.designation_risk,
  ];

  for (const c of candidates) {
    if (typeof c === 'number') return c;
    if (Array.isArray(c) && c.length === 2 && typeof c[1] === 'number') return c[1];
  }
  return null;
}


export interface SnapshotDelta {
  profileFields: { field: string; from: any; to: any }[];
  evidenceNodes: { node: string; fromValue: number | null; toValue: number | null }[];
  gladueFactors: { key: string; fromTicked: boolean; toTicked: boolean; textChanged: boolean }[];
  sceFactors:    { key: string; fromTicked: boolean; toTicked: boolean; textChanged: boolean }[];
  postFromRisk:  number | null;
  postToRisk:    number | null;
  riskDelta:     number | null;
}

/**
 * Compute the diff between two snapshots — which fields changed,
 * which evidence shifted, which factors toggled.
 */
export function computeSnapshotDelta(
  fromSnap: ScenarioSnapshot,
  toSnap:   ScenarioSnapshot,
): SnapshotDelta {
  // Profile field diffs
  const profileFields: { field: string; from: any; to: any }[] = [];
  const allProfileKeys = new Set([
    ...Object.keys(fromSnap.profile || {}),
    ...Object.keys(toSnap.profile || {}),
  ]);
  for (const k of allProfileKeys) {
    const f = fromSnap.profile?.[k];
    const t = toSnap.profile?.[k];
    if (f !== t && (f || t)) {
      profileFields.push({ field: k, from: f, to: t });
    }
  }

  // Evidence node diffs
  const evidenceNodes: { node: string; fromValue: number | null; toValue: number | null }[] = [];
  const evKeys = new Set([
    ...Object.keys(fromSnap.evidence || {}),
    ...Object.keys(toSnap.evidence || {}),
  ]);
  for (const node of evKeys) {
    const f = fromSnap.evidence?.[node];
    const t = toSnap.evidence?.[node];
    if (JSON.stringify(f) !== JSON.stringify(t)) {
      evidenceNodes.push({
        node,
        fromValue: typeof f?.value === 'number' ? f.value : null,
        toValue:   typeof t?.value === 'number' ? t.value : null,
      });
    }
  }

  // Gladue factor diffs
  const gladueFactors: { key: string; fromTicked: boolean; toTicked: boolean; textChanged: boolean }[] = [];
  const fromGl = fromSnap.gladue?.factor_states || {};
  const toGl   = toSnap.gladue?.factor_states || {};
  const glKeys = new Set([...Object.keys(fromGl), ...Object.keys(toGl)]);
  for (const k of glKeys) {
    const f = fromGl[k];
    const t = toGl[k];
    const fT = f?.ticked || false;
    const tT = t?.ticked || false;
    const textChanged = (f?.text || '') !== (t?.text || '');
    if (fT !== tT || textChanged) {
      gladueFactors.push({ key: k, fromTicked: fT, toTicked: tT, textChanged });
    }
  }

  // SCE factor diffs
  const sceFactors: { key: string; fromTicked: boolean; toTicked: boolean; textChanged: boolean }[] = [];
  const fromSc = fromSnap.sce?.factor_states || {};
  const toSc   = toSnap.sce?.factor_states || {};
  const scKeys = new Set([...Object.keys(fromSc), ...Object.keys(toSc)]);
  for (const k of scKeys) {
    const f = fromSc[k];
    const t = toSc[k];
    const fT = f?.ticked || false;
    const tT = t?.ticked || false;
    const textChanged = (f?.text || '') !== (t?.text || '');
    if (fT !== tT || textChanged) {
      sceFactors.push({ key: k, fromTicked: fT, toTicked: tT, textChanged });
    }
  }

  const postFromRisk = extractDoRisk(fromSnap.inference);
  const postToRisk   = extractDoRisk(toSnap.inference);
  const riskDelta =
    postFromRisk != null && postToRisk != null
      ? postToRisk - postFromRisk
      : null;

  return {
    profileFields,
    evidenceNodes,
    gladueFactors,
    sceFactors,
    postFromRisk,
    postToRisk,
    riskDelta,
  };
}
