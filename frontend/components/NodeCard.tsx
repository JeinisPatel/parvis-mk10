'use client';

import { NODES, TYPE_COLORS } from '@/lib/nodes';
import { PV } from '@/lib/tokens';
import { Glyph, ICON } from './Glyph';
import type { EvidenceEntry } from '@/lib/hooks/useEvidence';

interface Props {
  nodeId:      string;
  evidence?:   EvidenceEntry;
  /** Current marginal posterior from the live VE pass (0–1). */
  posterior?:  number;
  onToggle:    (nodeId: string) => void;
  onSlider:    (nodeId: string, value: number) => void;
  onClear:     (nodeId: string) => void;
}

/** Family → soft tint, for the quiet chip background (RATIO restraint). */
const SOFT: Record<string, string> = {
  risk:        PV.riskSoft,
  distortion:  PV.distortionSoft,
  mitigation:  PV.mitigationSoft,
  dual:        PV.dualSoft,
  special:     PV.specialSoft,
  constraint:  PV.constraintSoft,
  output:      PV.outputSoft,
};

/**
 * NodeCard — one row in the Risk & distortions screen.
 *
 *   ▍ N5  Invalid risk tools          ▢ toggle    [─────●───]  82%
 *
 * The left bar is the muted family colour. The toggle expresses hard evidence
 * (0 / 1); the slider expresses the practitioner's confidence as
 * P(node = true), feeding the post-VE soft-shift. The trailing number is the
 * live posterior from VE.
 *
 * Mk 10 note: the visual treatment is RATIO-muted (quiet family chip on a soft
 * tint instead of white-on-saturated), but every control and its wiring —
 * toggle, confidence slider, clear, the soft-shift API, the auto-rerun — is
 * exactly as Mk 9. Nothing about the engine or the interaction changed.
 */
export function NodeCard({ nodeId, evidence, posterior, onToggle, onSlider, onClear }: Props) {
  const meta = NODES[nodeId];
  if (!meta) return null;

  const color = TYPE_COLORS[meta.type];
  const soft  = SOFT[meta.type] ?? PV.paper3;
  const active = evidence?.value === 1;
  const sliderValue = evidence?.slider ?? (posterior ?? 0.5);
  const sliderPct = Math.round(sliderValue * 100);
  const posteriorPct = posterior != null ? Math.round(posterior * 100) : null;
  const hasEvidence = evidence !== undefined;

  return (
    <div
      className="grid items-center bg-paper rounded-lg border hover:shadow-sm transition-shadow"
      style={{
        gridTemplateColumns: '8px 56px 1fr 84px 220px 56px 24px',
        gap: 14,
        padding: '10px 14px',
        borderColor: hasEvidence ? `${color}44` : PV.border,
      }}
    >
      {/* Family colour bar */}
      <div style={{ width: 4, height: 28, borderRadius: 2, alignSelf: 'center', background: color }} />

      {/* Node id chip — quiet: family hue on its soft tint */}
      <div
        className="font-mono rounded text-center"
        style={{
          background: soft,
          color,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.04em',
          padding: '3px 0',
          lineHeight: 1.2,
        }}
      >
        N{nodeId}
      </div>

      {/* Short label */}
      <div className="flex flex-col leading-tight">
        <span className="text-ink" style={{ fontSize: 13.5, fontWeight: 500 }}>
          {meta.short}
        </span>
        <span className="font-serif italic text-ink3 truncate" style={{ fontSize: 11.5 }}>
          {meta.name}
        </span>
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={() => onToggle(nodeId)}
        disabled={!meta.ev}
        className="rounded-full transition-colors font-mono"
        style={{
          height: 22,
          padding: '0 10px',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          background: !meta.ev ? PV.paper3 : active ? color : 'transparent',
          color:      !meta.ev ? PV.ink4 : active ? PV.ground : PV.ink3,
          border:     `1px solid ${!meta.ev ? PV.border : active ? color : PV.border3}`,
          cursor:     meta.ev ? 'pointer' : 'not-allowed',
        }}
      >
        {!meta.ev ? 'derived' : active ? 'present' : 'absent'}
      </button>

      {/* Confidence slider */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sliderValue}
          disabled={!meta.ev}
          onChange={(e) => onSlider(nodeId, parseFloat(e.target.value))}
          style={{
            flex: 1,
            accentColor: color,
            opacity: meta.ev ? 1 : 0.4,
            cursor: meta.ev ? 'pointer' : 'not-allowed',
          }}
        />
        <span
          className="font-mono tabular-nums text-ink3"
          style={{ fontSize: 11, minWidth: 32, textAlign: 'right' }}
        >
          {sliderPct}%
        </span>
      </div>

      {/* Live posterior */}
      <div
        className="font-mono font-semibold tabular-nums text-right"
        style={{ fontSize: 12, color: posterior != null ? color : PV.ink4 }}
      >
        {posteriorPct != null ? `${posteriorPct}%` : '—'}
      </div>

      {/* Clear button */}
      <button
        type="button"
        onClick={() => onClear(nodeId)}
        disabled={!hasEvidence}
        className="text-ink4 transition-colors"
        title="Clear evidence for this node"
        style={{
          opacity: hasEvidence ? 1 : 0.25,
          cursor: hasEvidence ? 'pointer' : 'default',
        }}
      >
        <Glyph d={ICON.close} size={12} />
      </button>
    </div>
  );
}
