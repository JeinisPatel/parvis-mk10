'use client';

import { useCallback, useEffect, useState } from 'react';
import { readApiKeySync } from '@/lib/hooks/useApiKey';
import { readProfileSync } from '@/lib/hooks/useProfile';


/**
 * useIntakeChat — PARVIS-led structured interview state.
 *
 * State persists to localStorage under parvis.mk9.chat.<case_slug>, so each
 * case gets its own conversation history. Switching cases reloads from the
 * new bucket; clearing history wipes the current case's bucket only.
 *
 * The hook holds:
 *   messages[]      — full conversation history (user + assistant turns)
 *   extracted       — accumulated structured fields across all turns
 *   suggestions[]   — PARVIS's pending field suggestions for the sidebar
 *   phase, ...      — interview progress, returned from each turn
 *   pending         — true while a turn is in flight
 *
 * Suggestions are NOT auto-applied to profile / record. The practitioner
 * clicks Apply on each card; that's when the data flows into the case state.
 */

export interface IntakeMessage {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  turnIndex: number;
  timestamp: string;
}

export interface IntakeSuggestion {
  id:          string;
  field:       string;
  value:       any;
  confidence:  number;
  rationale:   string;
  sourceTurnIndex: number;
  status:      'pending' | 'applied' | 'dismissed';
}

interface IntakeChatState {
  messages:    IntakeMessage[];
  extracted:   Record<string, any>;
  suggestions: IntakeSuggestion[];
  phase:       string | null;
  phaseLabel:  string;
  cadence:     string;
  percent:     number;
  isComplete:  boolean;
}

const EMPTY_STATE: IntakeChatState = {
  messages:    [],
  extracted:   {},
  suggestions: [],
  phase:       'identity',
  phaseLabel:  'Identity & charge',
  cadence:     'open',
  percent:     0,
  isComplete:  false,
};


function caseSlug(caseRef: string): string {
  return (caseRef || 'unfiled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'unfiled';
}

function storageKey(caseRef: string): string {
  return `parvis.mk9.chat.${caseSlug(caseRef)}`;
}

function resolveCaseRef(): string {
  try {
    const profile = readProfileSync();
    if (profile?.caseReference) return profile.caseReference;
  } catch { /* */ }
  return 'Unfiled';
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}


export function useIntakeChat() {
  const [caseRef, setCaseRef] = useState<string>('Unfiled');
  const [state, setState] = useState<IntakeChatState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const cr = resolveCaseRef();
    setCaseRef(cr);
    try {
      const raw = window.localStorage.getItem(storageKey(cr));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<IntakeChatState>;
        setState({ ...EMPTY_STATE, ...parsed });
      }
    } catch { /* */ }
    setHydrated(true);
  }, []);

  // Persist on every state change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(caseRef), JSON.stringify(state));
    } catch { /* quota / private mode — silent */ }
  }, [state, caseRef, hydrated]);

  // Poll the case reference; reload state if it changes.
  useEffect(() => {
    const id = window.setInterval(() => {
      const cr = resolveCaseRef();
      if (cr !== caseRef) {
        setCaseRef(cr);
        try {
          const raw = window.localStorage.getItem(storageKey(cr));
          setState(raw
            ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<IntakeChatState>) }
            : EMPTY_STATE
          );
        } catch {
          setState(EMPTY_STATE);
        }
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, [caseRef]);

  const send = useCallback(async (text: string): Promise<boolean> => {
    if (!text.trim() || pending) return false;
    setError(null);

    const turnIndex = state.messages.length;
    const userMsg: IntakeMessage = {
      id:        makeId(),
      role:      'user',
      content:   text.trim(),
      turnIndex,
      timestamp: new Date().toISOString(),
    };
    // Optimistically add the user message.
    setState((prev) => ({ ...prev, messages: [...prev.messages, userMsg] }));
    setPending(true);

    try {
      const keyData = readApiKeySync();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (keyData) {
        headers['X-Parvis-Api-Key']      = keyData.key;
        headers['X-Parvis-Api-Provider'] = keyData.provider;
      }
      const res = await fetch('/api/v1/intake/turn', {
        method:  'POST',
        headers,
        body: JSON.stringify({
          case_reference:       caseRef,
          conversation_history: [...state.messages, userMsg].map((m) => ({
            role:    m.role,
            content: m.content,
          })),
          user_message:     text.trim(),
          extracted_so_far: state.extracted,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      const data = await res.json();

      const assistantMsg: IntakeMessage = {
        id:        makeId(),
        role:      'assistant',
        content:   data.assistant_message || '(no response)',
        turnIndex: turnIndex + 1,
        timestamp: new Date().toISOString(),
      };

      const newSuggestions: IntakeSuggestion[] = (data.suggestions || []).map((s: any) => ({
        id:              makeId(),
        field:           String(s.field || ''),
        value:           s.value,
        confidence:      Number(s.confidence || 0),
        rationale:       String(s.rationale || ''),
        sourceTurnIndex: turnIndex + 1,
        status:          'pending' as const,
      }));

      setState((prev) => ({
        ...prev,
        messages:    [...prev.messages, assistantMsg],
        // Don't merge extracted on no-key — backend returns {} anyway
        extracted:   { ...prev.extracted, ...(data.new_extracted || {}) },
        suggestions: [...prev.suggestions, ...newSuggestions],
        phase:       data.phase || prev.phase,
        phaseLabel:  data.phase_label || prev.phaseLabel,
        cadence:     data.cadence || prev.cadence,
        percent:     data.percent_total ?? prev.percent,
        isComplete:  !!data.is_complete,
      }));

      if (data.status === 'failed' || data.status === 'parse_failed') {
        setError(data.error || 'Turn failed');
      }
      return true;
    } catch (e: any) {
      setError(String(e?.message || e));
      return false;
    } finally {
      setPending(false);
    }
  }, [pending, state.messages, state.extracted, caseRef]);

  const applySuggestion = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.id === id ? { ...s, status: 'applied' as const } : s
      ),
    }));
    // The actual write into profile/record state happens at the page level
    // because the page knows about the relevant hooks; the hook just tracks
    // which suggestions are applied.
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.id === id ? { ...s, status: 'dismissed' as const } : s
      ),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState(EMPTY_STATE);
    try {
      window.localStorage.removeItem(storageKey(caseRef));
    } catch { /* */ }
  }, [caseRef]);

  return {
    caseRef,
    hydrated,
    pending,
    error,
    ...state,
    send,
    applySuggestion,
    dismissSuggestion,
    clearHistory,
  };
}
