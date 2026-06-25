'use client';

import { TopBar } from '@/components/TopBar';
import { NodeCard } from '@/components/NodeCard';
import { NODES, type NodeType } from '@/lib/nodes';
import { useEvidence } from '@/lib/hooks/useEvidence';
import { PV } from '@/lib/tokens';
import { ItalicCaption } from '@/components/atoms/ItalicCaption';
import { Glyph, ICON } from '@/components/Glyph';

/**
 * Risk & Distortions — the screen where the network becomes interactive.
 *
 * Left panel: every node grouped by family. Each row is a NodeCard with
 * toggle, confidence slider, and live posterior. Right rail: the persistent
 * DO designation badge, updating in real time as evidence shifts. The page
 * uses /api/v1/inference/soft so slider positions become post-VE additive
 * shifts in the style of Mk 8's counterfactual_audit.apply_conditions().
 *
 * Inference re-runs automatically on toggle (instant) and on slider drag
 * (debounced 150ms — see useEvidence.useDebouncedValue).
 *
 * Mk 10: muted family palette, RATIO surfaces, and the live posterior reaches
 * for claret only when it crosses the 87% BRD threshold. Behaviour, the
 * evidence hook, and the engine are untouched.
 */

const BRD_THRESHOLD = 0.87;

const FAMILY_COLORS: Record<NodeType, string> = {
  constraint: PV.constraint,
  risk:       PV.risk,
  distortion: PV.distortion,
  mitigation: PV.mitigation,
  dual:       PV.dual,
  special:    PV.special,
  output:     PV.output,
};

const FAMILIES: { type: NodeType; label: string; blurb: string }[] = [
  {
    type:  'risk',
    label: 'Substantive risk',
    blurb: 'Raw risk inputs entering the network — violence history, '
         + 'validated psychopathy, sexual offence profile, dynamic risk.',
  },
  {
    type:  'distortion',
    label: 'Systemic & procedural distortions',
    blurb: 'Distortion signals that engage the record-reliability discount '
         + 'under Ch.5 §5.1.20 — invalid risk tools, IAC, bail-WCGP cascade, '
         + 'Gladue misapplication, over-policing, collider bias, temporal '
         + 'distortion, tariff disparities, and no rehabilitative progress.',
  },
  {
    type:  'mitigation',
    label: 'Mitigations',
    blurb: 'Intergenerational trauma as a mitigation under Gladue / Ipeelee.',
  },
  {
    type:  'dual',
    label: 'Dual-factor',
    blurb: 'FASD — recognised in Friesen as both vulnerability and risk.',
  },
  {
    type:  'special',
    label: 'Detectors',
    blurb: 'Gaming risk — a special node that flags when the evidence pattern '
         + 'suggests the assessment is being gamed.',
  },
  {
    type:  'constraint',
    label: 'Constraints',
    blurb: 'Burden of proof under s.7 of the Charter — the doctrinal floor.',
  },
];

export default function RiskDistortionsPage() {
  const { evidence, toggle, setSlider, clear, reset, inference, isLoading, error } = useEvidence();

  return (
    <>
      <TopBar breadcrumb="Risk & distortions" />

      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr 280px',
          gap: 28,
          padding: '24px 36px',
          alignItems: 'start',
        }}
      >
        {/* Left — node groups */}
        <div>
          <div className="mb-6">
            <h1 className="font-serif text-ink mb-1" style={{ fontSize: 26 }}>
              Risk &amp; distortions
            </h1>
            <p
              className="font-serif italic text-ink2 leading-relaxed"
              style={{ fontSize: 14, maxWidth: 640 }}
            >
              The full Bayesian network, grouped by family. Toggle a node to set
              hard evidence. Drag the slider to express your confidence as a
              post-VE posterior shift in the style of the counterfactual audit.
              Every change re-runs Variable Elimination against the live engine.
            </p>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={reset}
              className="font-mono uppercase tracking-caps rounded border hover:bg-paper3 transition-colors flex items-center gap-1.5"
              style={{ fontSize: 10, padding: '5px 10px', color: PV.ink3, borderColor: PV.border2 }}
            >
              <Glyph d={ICON.arrowDn} size={10} color={PV.ink3} />
              reset to demo
            </button>
            <span className="text-ink4 font-mono" style={{ fontSize: 11 }}>
              {Object.keys(evidence).length} of {Object.values(NODES).filter((n) => n.ev).length} evidence nodes observed
            </span>
            {isLoading && (
              <span className="font-mono uppercase tracking-caps" style={{ fontSize: 10, color: PV.ink4 }}>
                · running VE…
              </span>
            )}
            {error && (
              <span className="font-mono uppercase tracking-caps" style={{ fontSize: 10, color: PV.claret }}>
                · {error.message}
              </span>
            )}
          </div>

          {/* Families */}
          {FAMILIES.map((fam) => {
            const nodes = Object.values(NODES).filter((n) => n.type === fam.type);
            if (nodes.length === 0) return null;
            return (
              <section key={fam.type} className="mb-7">
                <div className="mb-2 pb-1.5 border-b border-border2">
                  <div className="label-caps mb-1" style={{ color: FAMILY_COLORS[fam.type] }}>
                    {fam.label}
                  </div>
                  <ItalicCaption>{fam.blurb}</ItalicCaption>
                </div>
                <div className="flex flex-col gap-1.5">
                  {nodes.map((n) => (
                    <NodeCard
                      key={n.id}
                      nodeId={String(n.id)}
                      evidence={evidence[String(n.id)]}
                      posterior={inference?.posteriors[String(n.id)]}
                      onToggle={toggle}
                      onSlider={setSlider}
                      onClear={clear}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right — sticky live posterior */}
        <aside className="sticky" style={{ top: 24 }}>
          <div className="rounded-xl border bg-paper2 p-5" style={{ borderColor: PV.border2 }}>
            <div className="label-caps mb-2">Live posterior</div>

            {error ? (
              <div className="font-mono" style={{ fontSize: 12, color: PV.claret }}>
                {error.message}
              </div>
            ) : !inference ? (
              <div className="font-mono text-ink3" style={{ fontSize: 12 }}>
                running VE…
              </div>
            ) : (
              <LiveBadge value={inference.do_risk} />
            )}

            {inference?.shifts_applied && Object.keys(inference.shifts_applied).length > 0 && (
              <div className="mt-4 pt-3 border-t border-border2">
                <div className="label-caps mb-2">Shifts applied</div>
                {Object.entries(inference.shifts_applied)
                  .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                  .slice(0, 5)
                  .map(([nid, shift]) => (
                    <div key={nid} className="flex items-center justify-between py-1" style={{ fontSize: 11 }}>
                      <span className="text-ink2">
                        N{nid} · {NODES[nid]?.short ?? '—'}
                      </span>
                      <span
                        className="font-mono tabular-nums"
                        style={{ color: shift > 0 ? PV.risk : PV.mitigation, fontWeight: 600 }}
                      >
                        {shift > 0 ? '+' : ''}{(shift * 100).toFixed(1)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function bandFor(v: number): { label: string; color: string } {
  if (v >= 0.70) return { label: 'High',     color: PV.claret      };
  if (v >= 0.55) return { label: 'Elevated', color: PV.constraint  };
  if (v >= 0.40) return { label: 'Moderate', color: PV.constraint  };
  if (v >= 0.20) return { label: 'Low',      color: PV.mitigation  };
  return            { label: 'Very low', color: PV.mitigation  };
}

function LiveBadge({ value }: { value: number }) {
  const pct = Math.round(value * 1000) / 10;
  const band = bandFor(value);
  const crossed = value >= BRD_THRESHOLD;
  return (
    <div>
      <div className="label-caps mb-1" style={{ color: band.color }}>
        DO designation risk
      </div>
      <div className="font-serif" style={{ fontSize: 44, lineHeight: 1, color: band.color }}>
        {pct.toFixed(1)}
        <span style={{ fontSize: 22 }}>%</span>
      </div>
      <div className="font-serif italic mt-1" style={{ fontSize: 14, color: band.color }}>
        {band.label}
      </div>
      {/* BRD threshold reference — claret only once crossed. */}
      <div
        className="font-mono mt-2 pt-2 border-t"
        style={{
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: crossed ? PV.claret : PV.ink4,
          borderColor: PV.border2,
        }}
      >
        {crossed ? 'above' : 'below'} BRD threshold · 87%
      </div>
    </div>
  );
}
