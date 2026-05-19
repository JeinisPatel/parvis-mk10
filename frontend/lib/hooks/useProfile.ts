'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Case profile state.
 *
 * Mirrors the data a Gladue/SCE writer or defence counsel would record at
 * intake: identity, demographic context relevant to Gladue/Ipeelee, the
 * specific s.753 application and Crown position, and the procedural posture
 * of the hearing.
 *
 * Field ids are stable across versions — adding new fields is fine, but
 * never rename or delete existing keys without a migration.
 *
 * Storage: browser localStorage under PROFILE_KEY. Phase A.5 swaps this for
 * Supabase by replacing useProfile's persistence layer; the consumer API
 * (the values, the update setters) stays the same.
 */

export interface CaseProfile {
  // ── Identity ─────────────────────────────────────────────────────────────
  caseReference:    string;   // e.g. "R v Akwasi"
  givenName:        string;
  familyName:       string;
  dateOfBirth:      string;   // ISO YYYY-MM-DD
  pronouns:         string;

  // ── Gladue / Ipeelee context (without claim — the Profile records facts) ──
  indigenousIdentity:    'none' | 'first_nations' | 'metis' | 'inuit' | 'other_indigenous';
  nationCommunity:       string;   // free text — nation, treaty, community
  placeOfOrigin:         string;   // community / reserve / urban centre
  currentResidence:      string;

  // ── Health & cognition (advisory — Profile flags, Risk & distortions claims) ──
  fasdDiagnosis:    boolean;
  cognitiveAssess:  boolean;
  mentalHealthDx:   string;        // free text — short description, no specifics required

  // ── Offence ──────────────────────────────────────────────────────────────
  primaryCharge:    string;        // e.g. "Aggravated assault s.268"
  additionalCharges:string;        // free text, comma-separated
  s753Application:  'filed' | 'contemplated' | 'not_yet';
  crownPosition:    string;        // "Crown seeking DO designation + indeterminate sentence"
  defencePosition:  string;

  // ── Court / procedural posture ───────────────────────────────────────────
  jurisdiction:     string;        // e.g. "Ontario"
  court:            string;        // e.g. "ONSC"
  courthouse:       string;        // e.g. "361 University Avenue, Toronto"
  presidingJudge:   string;
  hearingDate:      string;        // ISO
  defenceCounsel:   string;
  crownCounsel:     string;
}

export const DEFAULT_PROFILE: CaseProfile = {
  caseReference:        '',
  givenName:            '',
  familyName:           '',
  dateOfBirth:          '',
  pronouns:             '',

  indigenousIdentity:   'none',
  nationCommunity:      '',
  placeOfOrigin:        '',
  currentResidence:     '',

  fasdDiagnosis:        false,
  cognitiveAssess:      false,
  mentalHealthDx:       '',

  primaryCharge:        '',
  additionalCharges:    '',
  s753Application:      'not_yet',
  crownPosition:        '',
  defencePosition:      '',

  jurisdiction:         '',
  court:                '',
  courthouse:           '',
  presidingJudge:       '',
  hearingDate:          '',
  defenceCounsel:       '',
  crownCounsel:         '',
};

const PROFILE_KEY = 'parvis.mk9.profile';

/**
 * Profile hook — persists to localStorage on every change, reads on mount.
 *
 * SSR-safe: localStorage is only touched inside useEffect, so Next.js's
 * server render produces an empty profile and the client hydrates the real
 * one on first mount. The brief flicker is acceptable for an intake form.
 */
export function useProfile() {
  const [profile, setProfile] = useState<CaseProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CaseProfile>;
        // Merge with defaults so new fields don't break old saved profiles.
        setProfile({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — silently fall
      // back to the default profile. The form still works in-memory.
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Silently swallow quota errors.
    }
  }, [profile, hydrated]);

  const update = useCallback(<K extends keyof CaseProfile>(field: K, value: CaseProfile[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
  }, []);

  return { profile, update, reset, hydrated };
}


/**
 * Static module-level read for components that need profile data but don't
 * want to subscribe to changes (e.g. the TopBar's case heading).
 *
 * Returns null on the server or if no profile is saved yet.
 */
export function readProfileSync(): CaseProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) } as CaseProfile;
  } catch {
    return null;
  }
}