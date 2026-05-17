'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * API-key state for the document analyzer (and other LLM-backed features).
 *
 * State is stored in browser localStorage and never leaves the user's machine
 * except when explicitly sent as a request header to the PARVIS backend. The
 * backend uses the key once per request and never persists it.
 *
 * Phase A.5 may swap this for an authenticated-server-side store, but the
 * consumer API (the values, the setter) will stay the same.
 *
 * Storage key: parvis.mk9.apikey
 * Stored shape:
 *   { provider: 'anthropic' | 'openai' | 'gemini',
 *     key:      string,
 *     savedAt:  ISO timestamp,
 *     lastTest: 'never' | 'passed' | 'failed' | 'pending',
 *     testNote: optional human-readable note }
 */

export type Provider = 'anthropic' | 'openai' | 'gemini';

export interface ApiKeyState {
  provider:  Provider;
  key:       string;
  savedAt:   string;
  lastTest:  'never' | 'passed' | 'failed' | 'pending';
  testNote:  string;
}

const STORAGE_KEY = 'parvis.mk9.apikey';

export const PROVIDER_META: Record<Provider, {
  label:      string;
  recommended:boolean;
  keyPrefix:  string;
  signupUrl:  string;
  envHint:    string;
}> = {
  anthropic: {
    label:       'Anthropic Claude',
    recommended: true,
    keyPrefix:   'sk-ant-',
    signupUrl:   'https://console.anthropic.com/settings/keys',
    envHint:     'Mk 8 prompts are tuned for Claude.',
  },
  openai: {
    label:       'OpenAI GPT',
    recommended: false,
    keyPrefix:   'sk-',
    signupUrl:   'https://platform.openai.com/api-keys',
    envHint:     'Supported but the analyzer was tuned for Claude.',
  },
  gemini: {
    label:       'Google Gemini',
    recommended: false,
    keyPrefix:   '',
    signupUrl:   'https://aistudio.google.com/app/apikey',
    envHint:     'Supported but the analyzer was tuned for Claude.',
  },
};

const DEFAULT_STATE: ApiKeyState = {
  provider:  'anthropic',
  key:       '',
  savedAt:   '',
  lastTest:  'never',
  testNote:  '',
};


export function useApiKey() {
  const [state, setState] = useState<ApiKeyState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ApiKeyState>;
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch { /* silent fallback */ }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* silent: quota or private mode */ }
  }, [state, hydrated]);

  const setProvider = useCallback((provider: Provider) => {
    setState((prev) => ({
      ...prev,
      provider,
      // A provider switch invalidates the previous test.
      lastTest: prev.provider === provider ? prev.lastTest : 'never',
      testNote: prev.provider === provider ? prev.testNote : '',
    }));
  }, []);

  const setKey = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      key,
      savedAt: key ? new Date().toISOString() : '',
      lastTest: 'never',
      testNote: '',
    }));
  }, []);

  const clear = useCallback(() => {
    setState(DEFAULT_STATE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* silent */ }
  }, []);

  const markTestResult = useCallback(
    (result: 'passed' | 'failed' | 'pending', note: string = '') => {
      setState((prev) => ({ ...prev, lastTest: result, testNote: note }));
    },
    [],
  );

  return {
    state,
    hasKey:  state.key.length > 0,
    setProvider,
    setKey,
    clear,
    markTestResult,
    hydrated,
  };
}


/**
 * Static read for components that need to send the key as a header but don't
 * subscribe to changes (e.g. one-shot API calls). Returns null when no key
 * is configured or on the server.
 */
export function readApiKeySync(): { provider: Provider; key: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ApiKeyState>;
    if (!parsed.key) return null;
    return {
      provider: (parsed.provider ?? 'anthropic') as Provider,
      key:      parsed.key,
    };
  } catch {
    return null;
  }
}