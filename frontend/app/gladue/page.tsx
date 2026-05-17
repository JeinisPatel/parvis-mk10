'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { TopBar } from '@/components/TopBar';
import { useProfile } from '@/lib/hooks/useProfile';
import { useEvidence } from '@/lib/hooks/useEvidence';
import {
  useGladue,
  GLADUE_FACTORS,
  GLADUE_CATEGORY_LABELS,
  GLADUE_CATEGORY_ANCHORS,
  type GladueCategory,
  type FactorState,
  type EvidenceSuggestion,
} from '@/lib/hooks/useGladue';

/**
 * Gladue factors — structured doctrinal screen.
 *
 * Anchored in Gladue (1999), Ipeelee (2012), Sharma (2022), and Morris
 * (2021 ONCA, by analogy for systemic-context method). The practitioner
 * ticks applicable factors across three categories, optionally writes
 * per-factor notes (with one-click ✨ suggest-text from PARVIS), and
 * generates a full streaming Gladue submission with inline citation pills.
 *
 * Three regions:
 *   Top    — header + doctrinal frame strip
 *   Body   — left: category accordions (~65%); right: rail (~35%)
 *            • Right rail: evidence implications + Generate button + legend
 *   Bottom — generated narrative with [SECTION] structure + citation pills
 */


// ── Citation rendering ──────────────────────────────────────────────────────

const CITATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  gladue:  { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  ipeelee: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  sharma:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  morris:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
};

const CITATION_LABELS: Record<string, string> = {
  gladue:  'Gladue',
  ipeelee: 'Ipeelee',
  sharma:  'Sharma',
  morris:  'Morris',
};

function InlineCitationPill({ marker, para }: { marker: string; para: number }) {
  const colors = CITATION_COLORS[marker] || CITATION_COLORS.gladue;
  const label  = CITATION_LABELS[marker] || marker;
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 px-1.5 py-0 mx-0.5 rounded text-xs font-mono ${colors.bg} ${colors.text} border ${colors.border} align-baseline`}
      title={`${label}, paragraph ${para}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="opacity-70">¶{para}</span>
    </span>
  );
}

function splitSections(text: string): { title: string; body: string }[] {
  const sectionPattern = /\[SECTION\]\s*([^\n]+)\n/g;
  const matches = [...text.matchAll(sectionPattern)];
  if (matches.length === 0) return [{ title: '', body: text }];

  const sections: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[1].trim();
    const bodyStart = match.index! + match[0].length;
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const body = text.substring(bodyStart, bodyEnd).trim();
    sections.push({ title, body });
  }
  return sections;
}

function renderProse(text: string): React.ReactNode[] {
  const pattern = /\[(gladue|ipeelee|sharma|morris):(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.substring(last, m.index));
    parts.push(<InlineCitationPill key={`p${key++}`} marker={m[1]} para={parseInt(m[2], 10)} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.substring(last));
  return parts;
}


// ── Factor row ──────────────────────────────────────────────────────────────

function FactorRow(props: {
  factor: typeof GLADUE_FACTORS[number];
  state: FactorState | undefined;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onSuggest: () => void;
  isSuggesting: boolean;
  hasApiKey: boolean;
}) {
  const { factor, state, onToggle, onTextChange, onSuggest, isSuggesting, hasApiKey } = props;
  const ticked = state?.ticked ?? false;
  const text = state?.text ?? '';

  return (
    <div className={`border-l-2 pl-4 py-3 transition-colors ${ticked ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={ticked}
          onChange={onToggle}
          className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`font-medium ${ticked ? 'text-slate-900' : 'text-slate-700'}`}>
              {factor.label}
            </span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {factor.case_anchor}
            </span>
            {factor.suggests_node && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {factor.suggests_node}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 italic mt-0.5">
            {factor.description}
          </div>
        </div>
      </label>

      {ticked && (
        <div className="mt-3 ml-7">
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Practitioner note — how does this factor apply to this client?"
            className="w-full min-h-[60px] px-3 py-2 text-sm border border-slate-200 rounded resize-y focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
          <div className="flex justify-between items-center mt-1.5">
            <button
              type="button"
              onClick={onSuggest}
              disabled={isSuggesting || !hasApiKey}
              className="text-xs text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              title={!hasApiKey ? 'Set API key in Settings to enable suggestions' : 'Draft factor narrative with PARVIS'}
            >
              {isSuggesting ? <>⋯ drafting…</> : <>✨ suggest text</>}
            </button>
            {text && (
              <span className="text-xs text-slate-400">
                {text.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Category accordion ──────────────────────────────────────────────────────

function CategoryAccordion(props: {
  category: GladueCategory;
  factorStates: Record<string, FactorState>;
  suggesting: string | null;
  hasApiKey: boolean;
  onToggle: (key: string) => void;
  onSetText: (key: string, text: string) => void;
  onSuggest: (key: string) => void;
}) {
  const { category, factorStates, suggesting, hasApiKey, onToggle, onSetText, onSuggest } = props;
  const [expanded, setExpanded] = useState(true);
  const factors = GLADUE_FACTORS.filter((f) => f.category === category);
  const tickedInCategory = factors.filter((f) => factorStates[f.key]?.ticked).length;

  return (
    <section className="mb-6 border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="text-left">
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            {GLADUE_CATEGORY_LABELS[category]}
          </h2>
          <p className="text-xs text-slate-500 italic mt-0.5">
            {GLADUE_CATEGORY_ANCHORS[category]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500">
            {tickedInCategory}/{factors.length}
          </span>
          <span className="text-slate-400">{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded && (
        <div className="divide-y divide-slate-100">
          {factors.map((f) => (
            <FactorRow
              key={f.key}
              factor={f}
              state={factorStates[f.key]}
              onToggle={() => onToggle(f.key)}
              onTextChange={(t) => onSetText(f.key, t)}
              onSuggest={() => onSuggest(f.key)}
              isSuggesting={suggesting === f.key}
              hasApiKey={hasApiKey}
            />
          ))}
        </div>
      )}
    </section>
  );
}


// ── Evidence suggestion card ────────────────────────────────────────────────

function EvidenceSuggestionCard({
  suggestion,
  applied,
  onApply,
}: {
  suggestion: EvidenceSuggestion;
  applied: boolean;
  onApply: () => void;
}) {
  const pct = Math.round(suggestion.value * 100);
  return (
    <div className={`border-l-2 pl-3 py-2.5 pr-2 rounded-r mb-2.5 ${applied ? 'border-emerald-400 bg-emerald-50/40' : 'border-indigo-400 bg-white'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-semibold text-sm text-slate-800">{suggestion.node}</span>
          <span className="text-xs text-slate-500">@ {pct}%</span>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={applied}
          className={`text-xs px-2 py-0.5 rounded transition-colors ${applied ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {applied ? '✓ APPLIED' : 'APPLY'}
        </button>
      </div>
      <p className="text-xs italic text-slate-600 mt-1 leading-snug">
        {suggestion.rationale}
      </p>
    </div>
  );
}


// ── Helper: read intake extracted state from localStorage ───────────────────

function caseSlug(ref: string | null | undefined): string {
  if (!ref) return 'unfiled';
  return ref.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unfiled';
}

function readIntakeExtracted(caseRef: string | null | undefined): Record<string, any> {
  if (typeof window === 'undefined' || !caseRef) return {};
  try {
    const raw = window.localStorage.getItem(`parvis.mk9.chat.${caseSlug(caseRef)}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.extracted || {};
  } catch {
    return {};
  }
}


// ── Page ────────────────────────────────────────────────────────────────────

export default function GladuePage() {
  const profileHook = useProfile();
  const caseRef = profileHook.profile.caseReference;
  const evidence = useEvidence();
  const gladue = useGladue(caseRef);

  // API key check (re-reads on storage events from other tabs)
  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => {
      try {
        const raw = window.localStorage.getItem('parvis.mk9.apikey');
        const parsed = raw ? JSON.parse(raw) : null;
        setHasApiKey(!!(parsed?.key));
      } catch {
        setHasApiKey(false);
      }
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  // Intake extracted state — read from localStorage, refreshed on case change
  const [intakeExtracted, setIntakeExtracted] = useState<Record<string, any>>({});
  useEffect(() => {
    setIntakeExtracted(readIntakeExtracted(caseRef));
  }, [caseRef]);

  // Track which evidence suggestions have been applied (session-scoped)
  const [appliedEvidence, setAppliedEvidence] = useState<Set<string>>(new Set());

  // Auto-scroll narrative panel as it streams
  const narrativeScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!narrativeScrollRef.current) return;
    if (gladue.state.narrative_status !== 'streaming') return;
    narrativeScrollRef.current.scrollTop = narrativeScrollRef.current.scrollHeight;
  }, [gladue.state.narrative, gladue.state.narrative_status]);

  // Derived: parsed narrative sections
  const sections = useMemo(
    () => splitSections(gladue.state.narrative || ''),
    [gladue.state.narrative],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSuggestText = (factorKey: string) => {
    gladue.suggestText(factorKey, profileHook.profile, intakeExtracted);
  };

  const handleGenerate = () => {
    // Refresh intake extract before sending — user might have added intake turns
    const fresh = readIntakeExtracted(caseRef);
    setIntakeExtracted(fresh);
    gladue.generateNarrative(profileHook.profile, fresh);
  };

  const handleApplyEvidence = (s: EvidenceSuggestion) => {
    try {
      evidence.setSlider(s.node, s.value);
      setAppliedEvidence((prev) => {
        const next = new Set(prev);
        next.add(s.node);
        return next;
      });
    } catch (err) {
      console.warn('Failed to apply evidence:', err);
    }
  };

  // ── Render guard ─────────────────────────────────────────────────────────

  if (!profileHook.hydrated || !gladue.hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-baseline gap-4 flex-wrap">
            <h1 className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Gladue Factors
            </h1>
            <span className="font-serif text-2xl text-slate-900">
              {caseRef || 'Unfiled'}
            </span>
            {profileHook.profile.jurisdiction && (
              <span className="font-serif italic text-slate-500">
                · {profileHook.profile.jurisdiction}
              </span>
            )}
          </div>
          <p className="font-serif italic text-slate-600 mt-3 max-w-3xl leading-relaxed">
            This screen is anchored in Gladue (1999), Ipeelee (2012),
            Sharma (2022), and Morris (2021 ONCA, by analogy for systemic-
            context method). Tick the factors that apply to this client,
            optionally add per-factor notes, and generate a doctrinally-
            grounded Gladue submission integrating all ticked factors with
            inline case citations.
          </p>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: category accordions */}
          <div>
            {(['systemic', 'individual', 'sentencing'] as GladueCategory[]).map((cat) => (
              <CategoryAccordion
                key={cat}
                category={cat}
                factorStates={gladue.state.factor_states}
                suggesting={gladue.state.suggesting}
                hasApiKey={hasApiKey}
                onToggle={gladue.toggle}
                onSetText={gladue.setText}
                onSuggest={handleSuggestText}
              />
            ))}
          </div>

          {/* Right: sticky rail */}
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-5">
            {/* Evidence implications */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
                Evidence implications
              </h3>
              {gladue.evidenceSuggestions.length === 0 ? (
                <p className="text-xs italic text-slate-400">
                  Tick factors to surface evidence-bridge suggestions for
                  the Bayesian network.
                </p>
              ) : (
                gladue.evidenceSuggestions.map((s, i) => (
                  <EvidenceSuggestionCard
                    key={`${s.node}-${i}`}
                    suggestion={s}
                    applied={appliedEvidence.has(s.node)}
                    onApply={() => handleApplyEvidence(s)}
                  />
                ))
              )}
            </div>

            {/* Generate submission */}
            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-indigo-700 mb-2">
                Generate submission
              </h3>
              <p className="text-xs text-slate-600 mb-3 leading-snug">
                {gladue.tickedCount === 0
                  ? 'Tick at least one factor to compose a Gladue submission.'
                  : `${gladue.tickedCount} factor${gladue.tickedCount === 1 ? '' : 's'} ticked. PARVIS will integrate them into a doctrinally-grounded submission with inline citations.`}
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  gladue.tickedCount === 0 ||
                  gladue.state.narrative_status === 'streaming' ||
                  !hasApiKey
                }
                className="w-full px-4 py-2.5 rounded font-medium text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {gladue.state.narrative_status === 'streaming'
                  ? '⋯ Composing submission…'
                  : '✨ Generate Gladue submission'}
              </button>
              {!hasApiKey && (
                <p className="text-xs text-amber-600 mt-2">
                  Set API key in Settings to enable.
                </p>
              )}
            </div>

            {/* Citation legend */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
                Citation key
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-baseline gap-2">
                  <InlineCitationPill marker="gladue" para={66} />
                  <span className="text-slate-600">R v Gladue, [1999] 1 SCR 688</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <InlineCitationPill marker="ipeelee" para={73} />
                  <span className="text-slate-600">R v Ipeelee, 2012 SCC 13</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <InlineCitationPill marker="sharma" para={78} />
                  <span className="text-slate-600">R v Sharma, 2022 SCC 39</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <InlineCitationPill marker="morris" para={74} />
                  <span className="text-slate-600">R v Morris, 2021 ONCA 680</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Narrative panel */}
        {(gladue.state.narrative || gladue.state.narrative_status !== 'idle') && (
          <section className="mt-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  Gladue submission
                </h2>
                <p className="font-serif italic text-sm text-slate-600 mt-0.5">
                  {caseRef || 'Unfiled'}
                  {gladue.state.narrative_status === 'streaming' && ' · composing…'}
                  {gladue.state.narrative_status === 'done' && ' · complete'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={gladue.state.narrative_status === 'streaming' || !hasApiKey || gladue.tickedCount === 0}
                  className="text-xs px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={gladue.clearNarrative}
                  className="text-xs px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  Clear
                </button>
              </div>
            </header>

            <div
              ref={narrativeScrollRef}
              className="px-6 py-5 max-h-[700px] overflow-y-auto"
            >
              {gladue.state.narrative_error && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                  {gladue.state.narrative_error}
                </div>
              )}
              {sections.map((sec, i) => (
                <div key={i} className="mb-6 last:mb-0">
                  {sec.title && (
                    <h3 className="font-serif text-lg text-slate-800 mb-2">
                      {sec.title}
                    </h3>
                  )}
                  <div className="font-serif text-slate-700 leading-relaxed text-[15px]">
                    {renderProse(sec.body)}
                  </div>
                </div>
              ))}
              {gladue.state.narrative_status === 'streaming' &&
                (!gladue.state.narrative || gladue.state.narrative.length < 20) && (
                  <div className="text-slate-400 italic text-sm">
                    PARVIS is composing the Gladue submission…
                  </div>
                )}
            </div>

            {/* References footer */}
            {gladue.citations.length > 0 && gladue.state.narrative_status === 'done' && (
              <footer className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">
                  References
                </h4>
                <div className="flex flex-wrap gap-2">
                  {gladue.citations.map((c, i) => (
                    <InlineCitationPill key={i} marker={c.marker} para={c.para} />
                  ))}
                </div>
              </footer>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
