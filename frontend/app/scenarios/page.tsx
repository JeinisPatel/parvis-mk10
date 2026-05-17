'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { TopBar } from '@/components/TopBar';
import { useProfile } from '@/lib/hooks/useProfile';
import { useEvidence } from '@/lib/hooks/useEvidence';
import {
  useScenarios,
  extractDoRisk,
  computeSnapshotDelta,
  type SavedScenario,
  type SnapshotDelta,
} from '@/lib/hooks/useScenarios';

/**
 * Scenarios — multi-profile comparison screen.
 *
 * Practitioners can save the current case state (profile + evidence +
 * inference + Gladue + SCE + chat-extracted + document-refs) as named
 * scenarios, then compare them visually:
 *
 *   1. Bar chart — DO designation posterior per scenario, with a single
 *      BRD threshold reference line at 87%. Below the line: Crown cannot
 *      meet the s.753 burden of proof. At or above: designation territory.
 *   2. Scenario cards — roster with key stats and action buttons.
 *   3. Pairwise delta — pick two scenarios, see what changed.
 *
 * Restore writes a snapshot back to live state via localStorage and
 * reloads the page so all hooks re-hydrate. A "save current first?"
 * confirmation flow guards against accidental overwrite.
 */


// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now  = Date.now();
  const ms = now - then;
  if (ms < 60_000)            return 'just now';
  if (ms < 60 * 60_000)       return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 24 * 60 * 60_000)  return `${Math.floor(ms / (60 * 60_000))} h ago`;
  if (ms < 7 * 24 * 60 * 60_000) return `${Math.floor(ms / (24 * 60 * 60_000))} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function zoneColors(risk: number | null): { fill: string; text: string; bg: string } {
  if (risk == null) return { fill: '#cbd5e1', text: '#475569', bg: 'bg-slate-100 text-slate-700' };
  if (risk < 0.87)  return { fill: '#10b981', text: '#047857', bg: 'bg-emerald-100 text-emerald-800' };
  return { fill: '#ef4444', text: '#b91c1c', bg: 'bg-rose-100 text-rose-800' };
}

function formatPct(v: number | null): string {
  if (v == null) return '—';
  return `${Math.round(v * 100)}%`;
}

function formatDelta(v: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(1)}%`;
}


// ── Bar chart ───────────────────────────────────────────────────────────────

function ScenarioBarChart({ scenarios }: { scenarios: SavedScenario[] }) {
  const CANVAS_WIDTH    = 900;
  const LABEL_WIDTH     = 220;
  const RIGHT_PADDING   = 70;
  const BAR_HEIGHT      = 26;
  const ROW_HEIGHT      = 44;
  const TOP_PADDING     = 36;
  const BOTTOM_PADDING  = 20;

  const chartWidth  = CANVAS_WIDTH - LABEL_WIDTH - RIGHT_PADDING;
  const chartHeight = scenarios.length * ROW_HEIGHT;
  const totalHeight = TOP_PADDING + chartHeight + BOTTOM_PADDING;
  const xScale = (v: number) => LABEL_WIDTH + v * chartWidth;

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${totalHeight}`}
      className="w-full"
      style={{ maxHeight: '60vh' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Axis labels */}
      <text x={LABEL_WIDTH}      y={20} fontSize="10" fill="#94a3b8" textAnchor="start">0%</text>
      <text x={xScale(0.87)}     y={20} fontSize="10" fill="#b91c1c" textAnchor="middle" fontWeight="600">87% · BRD</text>
      <text x={xScale(1)}        y={20} fontSize="10" fill="#94a3b8" textAnchor="end">100%</text>

      {/* Threshold lines */}
      <line x1={xScale(0.87)} y1={TOP_PADDING - 5} x2={xScale(0.87)} y2={TOP_PADDING + chartHeight + 5}
            stroke="#fca5a5" strokeWidth="2" strokeDasharray="4 4" />

      {/* Bars */}
      {scenarios.map((s, i) => {
        const risk = extractDoRisk(s.snapshot.inference);
        const colors = zoneColors(risk);
        const y = TOP_PADDING + i * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
        const barW = (risk ?? 0) * chartWidth;
        const labelText = s.name.length > 30 ? s.name.slice(0, 28) + '…' : s.name;

        return (
          <g key={s.id}>
            {/* Scenario name */}
            <text x={LABEL_WIDTH - 12} y={y + BAR_HEIGHT / 2 + 4}
                  fontSize="12" fill="#334155" textAnchor="end" fontWeight="500">
              {labelText}
            </text>
            {/* Bar background */}
            <rect x={LABEL_WIDTH} y={y} width={chartWidth} height={BAR_HEIGHT}
                  fill="#f1f5f9" rx="3" />
            {/* Bar fill */}
            {risk != null && (
              <rect x={LABEL_WIDTH} y={y} width={barW} height={BAR_HEIGHT}
                    fill={colors.fill} fillOpacity="0.85" rx="3" />
            )}
            {/* Percentage */}
            <text x={LABEL_WIDTH + (risk != null ? barW : 0) + 10}
                  y={y + BAR_HEIGHT / 2 + 4}
                  fontSize="12" fill={colors.text}
                  textAnchor="start" fontFamily="ui-monospace, monospace" fontWeight="600">
              {formatPct(risk)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


// ── Scenario card ───────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  isSelectedForCompare,
  onSelectForCompare,
  onRename,
  onDelete,
  onRestoreRequest,
}: {
  scenario: SavedScenario;
  isSelectedForCompare: boolean;
  onSelectForCompare: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onRestoreRequest: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(scenario.name);

  const risk = extractDoRisk(scenario.snapshot.inference);
  const colors = zoneColors(risk);

  const evidenceCount = useMemo(
    () => Object.values(scenario.snapshot.evidence || {})
      .filter((e: any) => e && (e.value !== undefined || e.evidence_value !== undefined))
      .length,
    [scenario.snapshot.evidence],
  );
  const gladueCount = useMemo(
    () => Object.values(scenario.snapshot.gladue?.factor_states || {})
      .filter((f: any) => f?.ticked).length,
    [scenario.snapshot.gladue],
  );
  const sceCount = useMemo(
    () => Object.values(scenario.snapshot.sce?.factor_states || {})
      .filter((f: any) => f?.ticked).length,
    [scenario.snapshot.sce],
  );

  const commitRename = () => {
    if (draftName.trim() && draftName !== scenario.name) {
      onRename(draftName);
    }
    setIsEditing(false);
  };

  return (
    <div className={`bg-white border rounded-lg p-4 transition-all ${
      isSelectedForCompare ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Header: name + delete */}
      <div className="flex items-start justify-between gap-2 mb-1">
        {isEditing ? (
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setDraftName(scenario.name); setIsEditing(false); }
            }}
            autoFocus
            className="flex-1 px-1.5 py-0.5 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        ) : (
          <h3 className="font-serif text-base text-slate-900 leading-tight cursor-pointer hover:text-indigo-700"
              onClick={() => { setDraftName(scenario.name); setIsEditing(true); }}
              title="Click to rename">
            {scenario.name}
          </h3>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-slate-300 hover:text-rose-500 transition-colors text-xs"
          title="Delete scenario"
          aria-label="Delete scenario"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-3">
        captured {formatRelative(scenario.snapshot.capturedAt)} · case: {scenario.snapshot.caseReference}
      </p>

      {/* Posterior badge */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-xs font-mono uppercase tracking-widest text-slate-500`}>DO risk</span>
        <span className={`text-lg font-serif font-semibold ${colors.bg.includes('emerald') ? 'text-emerald-700' : colors.bg.includes('amber') ? 'text-amber-700' : colors.bg.includes('rose') ? 'text-rose-700' : 'text-slate-700'}`}>
          {formatPct(risk)}
        </span>
      </div>

      {/* Stats grid */}
      <dl className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="bg-slate-50 rounded px-2 py-1.5">
          <dt className="text-slate-500 font-mono">Evidence</dt>
          <dd className="text-slate-800 font-mono font-semibold">{evidenceCount}</dd>
        </div>
        <div className="bg-slate-50 rounded px-2 py-1.5">
          <dt className="text-slate-500 font-mono">Gladue</dt>
          <dd className="text-slate-800 font-mono font-semibold">{gladueCount}</dd>
        </div>
        <div className="bg-slate-50 rounded px-2 py-1.5">
          <dt className="text-slate-500 font-mono">SCE</dt>
          <dd className="text-slate-800 font-mono font-semibold">{sceCount}</dd>
        </div>
      </dl>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSelectForCompare}
          className={`flex-1 text-xs px-2.5 py-1.5 rounded border transition-colors ${
            isSelectedForCompare
              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {isSelectedForCompare ? '✓ Compare' : 'Compare'}
        </button>
        <button
          type="button"
          onClick={onRestoreRequest}
          className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Restore
        </button>
      </div>
    </div>
  );
}


// ── Pairwise delta panel ────────────────────────────────────────────────────

function PairwiseDelta({
  scenarios,
  fromId,
  toId,
  onFromChange,
  onToChange,
}: {
  scenarios: SavedScenario[];
  fromId: string | null;
  toId:   string | null;
  onFromChange: (id: string) => void;
  onToChange:   (id: string) => void;
}) {
  const from = scenarios.find((s) => s.id === fromId);
  const to   = scenarios.find((s) => s.id === toId);

  const delta: SnapshotDelta | null = useMemo(() => {
    if (!from || !to || from.id === to.id) return null;
    return computeSnapshotDelta(from.snapshot, to.snapshot);
  }, [from, to]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      {/* Two-scenario picker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">
            From
          </label>
          <select
            value={fromId || ''}
            onChange={(e) => onFromChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">— pick a scenario —</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">
            To
          </label>
          <select
            value={toId || ''}
            onChange={(e) => onToChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">— pick a scenario —</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {!delta && (
        <p className="text-sm italic text-slate-400 text-center py-6">
          Pick two different scenarios above to see what changed between them.
        </p>
      )}

      {/* Delta body */}
      {delta && from && to && (
        <>
          {/* Risk delta headline */}
          <div className="border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">
                  DO designation posterior
                </p>
                <p className="font-serif text-2xl text-slate-900">
                  {formatPct(delta.postFromRisk)}
                  <span className="text-slate-400 mx-3 text-base">→</span>
                  {formatPct(delta.postToRisk)}
                </p>
              </div>
              <div className={`text-right`}>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">Δ</p>
                <p className={`font-serif text-2xl font-semibold ${
                  delta.riskDelta == null ? 'text-slate-400'
                    : delta.riskDelta > 0  ? 'text-rose-600'
                    : delta.riskDelta < 0  ? 'text-emerald-600'
                                           : 'text-slate-600'
                }`}>
                  {formatDelta(delta.riskDelta)}
                </p>
              </div>
            </div>
            <p className="text-xs italic text-slate-500 mt-2">
              {from.name} → {to.name}
            </p>
          </div>

          {/* Diff sections */}
          {delta.profileFields.length > 0 && (
            <DeltaSection title={`Profile changes (${delta.profileFields.length})`}>
              {delta.profileFields.map((p) => (
                <li key={p.field} className="text-sm">
                  <span className="font-mono text-xs text-slate-500 mr-2">{p.field}</span>
                  <span className="text-rose-700 line-through mr-1">{String(p.from ?? '—')}</span>
                  <span className="text-slate-400 mx-1">→</span>
                  <span className="text-emerald-700">{String(p.to ?? '—')}</span>
                </li>
              ))}
            </DeltaSection>
          )}

          {delta.evidenceNodes.length > 0 && (
            <DeltaSection title={`Evidence shifts (${delta.evidenceNodes.length})`}>
              {delta.evidenceNodes.map((e) => (
                <li key={e.node} className="text-sm">
                  <span className="font-mono text-xs text-slate-500 mr-2">{e.node}</span>
                  <span className="text-rose-700 mr-1">
                    {e.fromValue != null ? Math.round(e.fromValue * 100) + '%' : '—'}
                  </span>
                  <span className="text-slate-400 mx-1">→</span>
                  <span className="text-emerald-700">
                    {e.toValue != null ? Math.round(e.toValue * 100) + '%' : '—'}
                  </span>
                </li>
              ))}
            </DeltaSection>
          )}

          {delta.gladueFactors.length > 0 && (
            <DeltaSection title={`Gladue factors (${delta.gladueFactors.length})`}>
              {delta.gladueFactors.map((g) => (
                <li key={g.key} className="text-sm">
                  <span className="font-mono text-xs text-slate-500 mr-2">{g.key}</span>
                  {g.fromTicked !== g.toTicked ? (
                    <span>
                      <span className="text-slate-400">{g.fromTicked ? '✓' : '○'}</span>
                      <span className="text-slate-400 mx-1.5">→</span>
                      <span className={g.toTicked ? 'text-emerald-700 font-semibold' : 'text-rose-700'}>
                        {g.toTicked ? '✓' : '○'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-amber-600 italic text-xs">note text changed</span>
                  )}
                </li>
              ))}
            </DeltaSection>
          )}

          {delta.sceFactors.length > 0 && (
            <DeltaSection title={`SCE factors (${delta.sceFactors.length})`}>
              {delta.sceFactors.map((s) => (
                <li key={s.key} className="text-sm">
                  <span className="font-mono text-xs text-slate-500 mr-2">{s.key}</span>
                  {s.fromTicked !== s.toTicked ? (
                    <span>
                      <span className="text-slate-400">{s.fromTicked ? '✓' : '○'}</span>
                      <span className="text-slate-400 mx-1.5">→</span>
                      <span className={s.toTicked ? 'text-emerald-700 font-semibold' : 'text-rose-700'}>
                        {s.toTicked ? '✓' : '○'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-amber-600 italic text-xs">note text changed</span>
                  )}
                </li>
              ))}
            </DeltaSection>
          )}

          {delta.profileFields.length === 0
           && delta.evidenceNodes.length === 0
           && delta.gladueFactors.length === 0
           && delta.sceFactors.length === 0 && (
            <p className="text-sm italic text-slate-400 text-center py-4">
              No structural differences between these scenarios.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function DeltaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">
        {title}
      </h4>
      <ul className="space-y-1 pl-1">
        {children}
      </ul>
    </div>
  );
}


// ── Restore dialog (modal) ──────────────────────────────────────────────────

function RestoreDialog({
  scenario,
  onCancel,
  onSaveAndRestore,
  onDiscardAndRestore,
}: {
  scenario: SavedScenario;
  onCancel: () => void;
  onSaveAndRestore: (name: string) => void;
  onDiscardAndRestore: () => void;
}) {
  const [stage, setStage] = useState<'initial' | 'naming'>('initial');
  const [name, setName] = useState('Working state');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="font-serif text-lg text-slate-900 mb-2">
          Restore <span className="italic">{scenario.name}</span>?
        </h3>
        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          This will overwrite your current case state — profile, evidence,
          Gladue factors, and SCE factors — with the snapshot from{' '}
          <span className="italic">{formatRelative(scenario.snapshot.capturedAt)}</span>.
          The page will reload to re-hydrate from the restored state.
        </p>

        {stage === 'initial' && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStage('naming')}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Save current first, then restore
            </button>
            <button
              type="button"
              onClick={onDiscardAndRestore}
              className="px-4 py-2 rounded border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors text-sm"
            >
              Discard current, restore now
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        {stage === 'naming' && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">
              Save current state as
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onSaveAndRestore(name);
              }}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              placeholder="e.g. Working state"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStage('initial')}
                className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-700 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => onSaveAndRestore(name)}
                disabled={!name.trim()}
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Save & restore
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Page ────────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const profileHook = useProfile();
  const caseRef = profileHook.profile.caseReference;
  const evidence = useEvidence();
  const scenarios = useScenarios(caseRef);

  // Save controls
  const [saveName, setSaveName] = useState('');

  // Compare selection (max 2)
  const [compareFromId, setCompareFromId] = useState<string | null>(null);
  const [compareToId,   setCompareToId]   = useState<string | null>(null);

  // Restore dialog
  const [restoreCandidate, setRestoreCandidate] = useState<SavedScenario | null>(null);

  // Sort scenarios newest-first for display
  const sortedScenarios = useMemo(() => {
    return [...scenarios.scenarios].sort(
      (a, b) => new Date(b.snapshot.capturedAt).getTime() - new Date(a.snapshot.capturedAt).getTime(),
    );
  }, [scenarios.scenarios]);

  const handleSave = () => {
    const name = saveName.trim() || `Scenario ${scenarios.scenarios.length + 1}`;
    scenarios.save(name, {
      profile:   profileHook.profile,
      evidence:  evidence.evidence,
      inference: evidence.inference ?? null,
    });
    setSaveName('');
  };

  const handleCompareToggle = (id: string) => {
    if (compareFromId === id) {
      setCompareFromId(null);
      return;
    }
    if (compareToId === id) {
      setCompareToId(null);
      return;
    }
    if (!compareFromId) setCompareFromId(id);
    else if (!compareToId) setCompareToId(id);
    else {
      // Both slots full — rotate: drop oldest, accept new as 'to'
      setCompareFromId(compareToId);
      setCompareToId(id);
    }
  };

  const handleRestoreSaveFirst = (currentName: string) => {
    if (!restoreCandidate) return;
    // 1. Save current
    scenarios.save(currentName, {
      profile:   profileHook.profile,
      evidence:  evidence.evidence,
      inference: evidence.inference ?? null,
    });
    // 2. Restore selected — note: scenarios.restore triggers reload, so
    //    the save above must finish persisting first. The useEffect
    //    in the hook persists synchronously via setState commit, but to
    //    be safe we defer the restore one tick.
    const targetId = restoreCandidate.id;
    setTimeout(() => scenarios.restore(targetId), 50);
  };

  const handleRestoreDiscard = () => {
    if (!restoreCandidate) return;
    scenarios.restore(restoreCandidate.id);
  };

  if (!profileHook.hydrated || !scenarios.hydrated) {
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
              Scenarios
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
            Save the current case state as a named scenario — profile,
            evidence, computed posterior, Gladue and SCE factor ticks.
            Stage alternative configurations, compare their DO-designation
            posteriors side-by-side, and inspect what drives each delta.
          </p>
        </div>

        {/* Save controls */}
        <section className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
          <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
            Save current state
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder={`Scenario ${scenarios.scenarios.length + 1} — e.g. "Defence baseline"`}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              ✚ Save snapshot
            </button>
          </div>
          <p className="text-xs italic text-slate-500 mt-2">
            Captures profile, evidence, computed posterior, Gladue and SCE factor states.
            {evidence.inference == null && (
              <span className="text-amber-600"> (No inference computed yet — set evidence on the Risk &amp; distortions screen first.)</span>
            )}
          </p>
        </section>

        {/* Empty state */}
        {sortedScenarios.length === 0 && (
          <section className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
            <p className="font-serif italic text-slate-500">
              No scenarios saved yet for this case.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Build a state of interest on the other screens, then return here to save it as a snapshot.
            </p>
          </section>
        )}

        {/* Bar chart */}
        {sortedScenarios.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
              DO designation comparison
            </h2>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <ScenarioBarChart scenarios={sortedScenarios} />
            </div>
          </section>
        )}

        {/* Card grid */}
        {sortedScenarios.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
              Scenarios ({sortedScenarios.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedScenarios.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  isSelectedForCompare={s.id === compareFromId || s.id === compareToId}
                  onSelectForCompare={() => handleCompareToggle(s.id)}
                  onRename={(newName) => scenarios.rename(s.id, newName)}
                  onDelete={() => scenarios.remove(s.id)}
                  onRestoreRequest={() => setRestoreCandidate(s)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Pairwise delta */}
        {sortedScenarios.length >= 2 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
              Pairwise comparison
            </h2>
            <PairwiseDelta
              scenarios={sortedScenarios}
              fromId={compareFromId}
              toId={compareToId}
              onFromChange={setCompareFromId}
              onToChange={setCompareToId}
            />
          </section>
        )}

        {/* Restore dialog */}
        {restoreCandidate && (
          <RestoreDialog
            scenario={restoreCandidate}
            onCancel={() => setRestoreCandidate(null)}
            onSaveAndRestore={(currentName) => handleRestoreSaveFirst(currentName)}
            onDiscardAndRestore={handleRestoreDiscard}
          />
        )}
      </main>
    </div>
  );
}
