'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { NODES } from '@/lib/nodes';
import { PV, COLOR_FOR_TYPE, type NodeType } from '@/lib/tokens';
import { ItalicCaption } from '@/components/atoms/ItalicCaption';
import { Glyph, ICON } from '@/components/Glyph';
import { NodeTag } from '@/components/NodeTag';
import { runDecomposedInference, type DecomposedInferenceResponse } from '@/lib/api';
import Link from 'next/link';

/**
 * Inference — the analysis-focused read-only view.
 *
 * Reads the same evidence as Risk & distortions. Runs the decomposed
 * inference endpoint: the headline DO risk, the full posterior distribution,
 * per-family contributions to N20, and the nodes saturated at the [0.05, 0.95]
 * boundaries. Read-only; toggle the collider-discount reading; sort the
 * distribution; tap a saturated node to jump to Risk & distortions.
 *
 * Mk 10: muted families (incl. overriding the backend-supplied family colour),
 * the headline reaching for claret only past the 87% BRD threshold, and the
 * RATIO surface/type treatment. Engine and behaviour unchanged.
 */

const BRD_THRESHOLD = 0.87;

const DEMO_EVIDENCE: Record<string, 0 | 1> = {
  '5': 1, '6': 1, '7': 1, '8': 1, '9': 1, '17': 1,
};
const DEMO_SHIFTS: Record<string, number> = {};

/** Prefer the muted token colour over whatever hex the backend returns. */
function familyColor(family: string, fallback: string): string {
  return COLOR_FOR_TYPE[family as NodeType] ?? fallback;
}

export default function InferencePage() {
  const [colliderDiscount, setColliderDiscount] = useState(false);
  const [sortBy, setSortBy] = useState<'id' | 'posterior' | 'type'>('posterior');

  const inference = useQuery({
    queryKey: ['inference-decomposed', { colliderDiscount }],
    queryFn:  () => runDecomposedInference({
      evidence:          DEMO_EVIDENCE,
      shifts:            DEMO_SHIFTS,
      collider_discount: colliderDiscount,
    }),
    staleTime: 60_000,
  });

  return (
    <>
      <TopBar breadcrumb="Inference" />

      <div style={{ padding: '24px 36px 64px', maxWidth: 1080 }}>
        <div className="mb-6">
          <h1 className="font-serif text-ink mb-1" style={{ fontSize: 26 }}>
            Inference
          </h1>
          <p className="font-serif italic text-ink2 leading-relaxed" style={{ fontSize: 14, maxWidth: 720 }}>
            The read-only analysis view. Renders the Bayesian network&rsquo;s full
            posterior distribution under the current evidence, the per-family
            decomposition of the Dangerous Offender designation risk per
            Ch.5 §5.1.20, and any nodes saturated at the slider boundaries.
            To change the inputs, return to{' '}
            <Link href="/risk" className="underline" style={{ color: PV.slate }}>
              Risk &amp; distortions
            </Link>.
          </p>
        </div>

        {inference.error && (
          <div className="rounded-xl px-5 py-4 mb-6" style={{ background: PV.claretSoft, border: `1px solid ${PV.claret}33` }}>
            <div className="label-caps mb-1" style={{ color: PV.claret }}>
              Inference failed
            </div>
            <div className="font-mono text-ink2" style={{ fontSize: 12 }}>
              {(inference.error as Error).message}
            </div>
          </div>
        )}

        {inference.isLoading && (
          <div className="font-mono text-ink3" style={{ fontSize: 12 }}>
            running VE…
          </div>
        )}

        {inference.data && (
          <InferenceBody
            data={inference.data}
            colliderDiscount={colliderDiscount}
            onColliderDiscountChange={setColliderDiscount}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        )}
      </div>
    </>
  );
}

function InferenceBody({
  data, colliderDiscount, onColliderDiscountChange, sortBy, onSortChange,
}: {
  data: DecomposedInferenceResponse;
  colliderDiscount: boolean;
  onColliderDiscountChange: (v: boolean) => void;
  sortBy: 'id' | 'posterior' | 'type';
  onSortChange: (v: 'id' | 'posterior' | 'type') => void;
}) {
  const band = bandFor(data.do_risk);
  const crossed = data.do_risk >= BRD_THRESHOLD;

  return (
    <>
      {/* Headline */}
      <div className="grid items-start mb-7 pb-6 border-b border-border2" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 36 }}>
        <div>
          <div className="label-caps mb-2" style={{ color: band.color }}>
            Dangerous Offender designation risk
          </div>
          <div className="font-serif tabular-nums" style={{ fontSize: 72, lineHeight: 1, color: band.color, letterSpacing: '-0.02em' }}>
            {(data.do_risk * 100).toFixed(1)}
            <span style={{ fontSize: 36 }}>%</span>
          </div>
          <div className="font-serif italic mt-1.5" style={{ fontSize: 18, color: band.color }}>
            {band.label}
          </div>

          {/* BRD threshold reference */}
          <div
            className="font-mono mt-3 inline-flex items-center gap-2 rounded border"
            style={{
              fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '4px 9px',
              color: crossed ? PV.claret : PV.ink4,
              borderColor: crossed ? `${PV.claret}55` : PV.border2,
              background: crossed ? PV.claretSoft : 'transparent',
            }}
          >
            {crossed ? 'above' : 'below'} BRD threshold · 87%
          </div>

          {/* Collider discount toggle */}
          <div className="mt-5 pt-4 border-t flex items-start gap-3" style={{ borderColor: PV.border2, maxWidth: 440 }}>
            <input
              type="checkbox"
              id="collider-toggle"
              checked={colliderDiscount}
              onChange={(e) => onColliderDiscountChange(e.target.checked)}
              style={{ accentColor: PV.slate, width: 14, height: 14, marginTop: 3 }}
            />
            <label htmlFor="collider-toggle" className="cursor-pointer select-none" style={{ fontSize: 13, color: PV.ink2, lineHeight: 1.45 }}>
              <span className="font-medium">Apply §5.1.19 §8 collider discount</span>
              <span className="block font-serif italic text-ink3" style={{ fontSize: 12, marginTop: 2 }}>
                Returns a secondary reading. The headline DO risk is unchanged.
              </span>
            </label>
          </div>

          {data.do_risk_collider_discounted != null && (
            <div className="mt-4 flex items-baseline gap-3">
              <span className="label-caps" style={{ color: PV.slate }}>
                Collider-discounted reading
              </span>
              <span className="font-serif tabular-nums" style={{ fontSize: 22, color: PV.slate }}>
                {(data.do_risk_collider_discounted * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Provenance */}
        <div className="bg-paper2 rounded-xl border p-5" style={{ borderColor: PV.border2 }}>
          <div className="label-caps mb-3">Provenance</div>
          <Provenance label="Engine" value="Mk 8 · pgmpy Variable Elimination" />
          <Provenance label="Network" value={`${Object.keys(NODES).length} nodes`} />
          <Provenance label="Evidence" value={`${data.completeness.observed} of ${data.completeness.total_evidence_nodes} observed`} />
          <Provenance
            label="Shifts"
            value={data.shifts_applied && Object.keys(data.shifts_applied).length > 0 ? `${Object.keys(data.shifts_applied).length} applied` : 'none'}
          />
          <Provenance label="Run" value="just now" />
          <div className="mt-3 pt-3 border-t" style={{ borderColor: PV.border2 }}>
            <ItalicCaption size={11.5}>{data.provenance}</ItalicCaption>
          </div>
        </div>
      </div>

      <FamilyDecomposition data={data} />

      {data.saturated_nodes.length > 0 && <SaturatedNodes ids={data.saturated_nodes} />}

      <DistributionTable
        posteriors={data.posteriors}
        shiftsApplied={data.shifts_applied ?? {}}
        evidence={DEMO_EVIDENCE}
        sortBy={sortBy}
        onSortChange={onSortChange}
      />
    </>
  );
}

function Provenance({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5" style={{ fontSize: 12.5 }}>
      <span className="label-caps">{label}</span>
      <span className="text-ink2 font-medium tabular-nums">{value}</span>
    </div>
  );
}

function FamilyDecomposition({ data }: { data: DecomposedInferenceResponse }) {
  const total = data.families.reduce((acc, f) => acc + Math.abs(f.signed_contribution), 0) || 1;

  return (
    <section className="mb-9">
      <div className="mb-3">
        <h2 className="font-serif text-ink mb-1" style={{ fontSize: 19 }}>
          Per-family contribution to N20
        </h2>
        <ItalicCaption>
          Each family&rsquo;s signed contribution to the DO risk under Ch.5 §5.1.20.
          Risk families push the posterior up; distortions, mitigations,
          dual-factor, detectors, and constraints pull it down.
        </ItalicCaption>
      </div>

      <div className="flex flex-col gap-2">
        {data.families.map((fam) => {
          const color = familyColor(fam.family, fam.color);
          const widthPct = (Math.abs(fam.signed_contribution) / total) * 100;
          const sign = fam.signed_contribution >= 0 ? '+' : '−';
          return (
            <div key={fam.family} className="bg-paper rounded-lg border" style={{ borderColor: PV.border2, padding: '10px 14px' }}>
              <div className="flex items-baseline gap-3 mb-2">
                <div style={{ width: 4, height: 14, borderRadius: 2, alignSelf: 'center', background: color }} />
                <span className="font-serif font-medium text-ink flex-1" style={{ fontSize: 14 }}>
                  {fam.label}
                </span>
                <span className="font-mono uppercase tracking-caps text-ink3" style={{ fontSize: 10 }}>
                  {fam.sign === 'up' ? 'pushes up' : 'pulls down'}
                </span>
                <span className="font-serif tabular-nums font-medium" style={{ fontSize: 16, color, minWidth: 70, textAlign: 'right' }}>
                  {sign}{Math.abs(fam.signed_contribution).toFixed(3)}
                </span>
              </div>

              <div style={{ height: 6, borderRadius: 3, background: PV.paper3, overflow: 'hidden' }}>
                <div style={{ width: `${widthPct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 240ms cubic-bezier(0.4, 0, 0.2, 1)' }} />
              </div>

              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                {fam.nodes
                  .filter((n) => n.posterior > 0.001)
                  .map((n) => (
                    <span key={n.id} className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: PV.ink3 }}>
                      <NodeTag id={n.id} small />
                      <span>{NODES[n.id]?.short ?? `N${n.id}`}</span>
                      <span className="font-mono tabular-nums text-ink4">
                        {(n.posterior * 100).toFixed(0)}% · w={n.weight.toFixed(2)}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SaturatedNodes({ ids }: { ids: string[] }) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-baseline gap-2">
        <Glyph d={ICON.warn} size={14} color={PV.constraint} />
        <h2 className="font-serif text-ink" style={{ fontSize: 17 }}>
          Saturated nodes
        </h2>
        <span className="text-ink4 font-mono" style={{ fontSize: 11 }}>
          posterior at [0.05, 0.95] boundary
        </span>
      </div>
      <ItalicCaption>
        These nodes are pinned at the engine&rsquo;s saturation bounds — either by
        hard evidence or by slider shifts pushing them to the limit. Saturation
        means the model can&rsquo;t distinguish gradations beyond this point. Consider
        whether the evidence supports the saturated state, or whether a softer
        confidence reading would better reflect the inputs.
      </ItalicCaption>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.map((nid) => {
          const meta = NODES[nid];
          if (!meta) return null;
          return (
            <Link
              key={nid}
              href="/risk"
              className="inline-flex items-center gap-2 rounded-lg border hover:bg-paper3 transition-colors"
              style={{ padding: '6px 10px', fontSize: 12, borderColor: PV.border2 }}
            >
              <NodeTag id={nid} small />
              <span className="text-ink2">{meta.short}</span>
              <Glyph d={ICON.chevR} size={11} color={PV.ink4} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DistributionTable({
  posteriors, shiftsApplied, evidence, sortBy, onSortChange,
}: {
  posteriors:     Record<string, number>;
  shiftsApplied:  Record<string, number>;
  evidence:       Record<string, 0 | 1>;
  sortBy:         'id' | 'posterior' | 'type';
  onSortChange:   (v: 'id' | 'posterior' | 'type') => void;
}) {
  const rows = Object.entries(posteriors)
    .filter(([nid]) => nid !== '20')
    .map(([nid, p]) => {
      const meta = NODES[nid];
      return { id: nid, meta, posterior: p, shift: shiftsApplied[nid] ?? 0, observed: nid in evidence };
    })
    .filter((r) => r.meta);

  if (sortBy === 'posterior') {
    rows.sort((a, b) => b.posterior - a.posterior);
  } else if (sortBy === 'type') {
    const order = ['risk', 'distortion', 'mitigation', 'dual', 'special', 'constraint', 'output'];
    rows.sort((a, b) => {
      const ai = order.indexOf(a.meta!.type);
      const bi = order.indexOf(b.meta!.type);
      if (ai !== bi) return ai - bi;
      return a.meta!.id - b.meta!.id;
    });
  } else {
    rows.sort((a, b) => a.meta!.id - b.meta!.id);
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="font-serif text-ink mb-1" style={{ fontSize: 19 }}>
            Full posterior distribution
          </h2>
          <ItalicCaption>
            Marginal posteriors for all nodes returned by VE, plus the DO risk
            computed post-VE.
          </ItalicCaption>
        </div>
        <div className="flex items-center gap-1">
          <span className="label-caps mr-2">sort by</span>
          {(['id', 'posterior', 'type'] as const).map((opt) => {
            const active = sortBy === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSortChange(opt)}
                className="font-mono uppercase tracking-caps rounded border transition-colors"
                style={{
                  fontSize: 10,
                  padding: '4px 8px',
                  background: active ? PV.slate : 'transparent',
                  color:      active ? PV.ground : PV.ink3,
                  borderColor: active ? PV.slate : PV.border2,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden bg-paper" style={{ borderColor: PV.border2 }}>
        <div
          className="grid items-center bg-paper2 border-b"
          style={{ gridTemplateColumns: '8px 56px 1fr 80px 120px 80px', gap: 14, padding: '8px 14px', borderColor: PV.border2 }}
        >
          <span />
          <span className="label-caps">id</span>
          <span className="label-caps">node</span>
          <span className="label-caps text-right">observed</span>
          <span className="label-caps text-right">shift applied</span>
          <span className="label-caps text-right">P(=1)</span>
        </div>

        {rows.map((r) => {
          const color = r.meta ? COLOR_FOR_TYPE[r.meta.type] : PV.ink4;
          return (
            <div
              key={r.id}
              className="grid items-center border-b last:border-b-0 hover:bg-paper2 transition-colors"
              style={{ gridTemplateColumns: '8px 56px 1fr 80px 120px 80px', gap: 14, padding: '8px 14px', borderColor: PV.border2 }}
            >
              <div style={{ width: 3, height: 22, borderRadius: 1.5, alignSelf: 'center', background: color }} />
              <NodeTag id={r.id} small />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-ink truncate" style={{ fontSize: 13, fontWeight: 500 }}>
                  {r.meta!.short}
                </span>
                <span className="font-serif italic text-ink4 truncate" style={{ fontSize: 11 }}>
                  {r.meta!.type}
                </span>
              </div>
              <span className="text-right font-mono" style={{ fontSize: 11, color: r.observed ? PV.slate : PV.ink4 }}>
                {r.observed ? 'yes' : '—'}
              </span>
              <span
                className="text-right font-mono tabular-nums"
                style={{ fontSize: 11, color: Math.abs(r.shift) > 0.001 ? (r.shift > 0 ? PV.risk : PV.mitigation) : PV.ink4 }}
              >
                {Math.abs(r.shift) > 0.001 ? `${r.shift > 0 ? '+' : ''}${(r.shift * 100).toFixed(1)}pp` : '—'}
              </span>
              <span className="text-right font-mono tabular-nums font-semibold" style={{ fontSize: 13, color }}>
                {(r.posterior * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function bandFor(p: number): { label: string; color: string } {
  if (p >= 0.70) return { label: 'High',     color: PV.claret      };
  if (p >= 0.55) return { label: 'Elevated', color: PV.constraint  };
  if (p >= 0.40) return { label: 'Moderate', color: PV.constraint  };
  if (p >= 0.20) return { label: 'Low',      color: PV.mitigation  };
  return            { label: 'Very low', color: PV.mitigation  };
}
