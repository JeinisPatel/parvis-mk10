'use client';

import { useQuery } from '@tanstack/react-query';
import { runInference, checkHealth } from '@/lib/api';
import { TopBar } from '@/components/TopBar';
import { PosteriorBadge } from '@/components/PosteriorBadge';
import { NODES } from '@/lib/nodes';
import { PV } from '@/lib/tokens';
import { Stat } from '@/components/atoms/Stat';
import { NextCard } from '@/components/atoms/NextCard';
import { DriverRow } from '@/components/atoms/DriverRow';
import { ItalicCaption } from '@/components/atoms/ItalicCaption';
import { Glyph, ICON } from '@/components/Glyph';

/**
 * Overview (Home) — first ported screen of Mark 9.
 *
 * Replaces today's Summary tab. Lands the case at a glance:
 *   - Headline pill (engine status + last-VE timestamp)
 *   - Posterior badge (large) — live from /api/v1/inference
 *   - "Drivers up / down" — top-5 risk-side and mitigation-side nodes
 *     derived from the live posterior distribution
 *   - Headline stats — doctrinal frame, completeness, network size
 *   - "What's next" — three suggested actions
 *
 * The TopBar renders WITHOUT its compact PosteriorBadge on this screen
 * (showPosterior={false}) because the page body already renders the large
 * one — showing both on the same screen is redundant.
 *
 * Phase A.2 swaps DEMO_EVIDENCE for the real case object pulled from
 * Supabase. For now we use the same anonymised demo evidence as the
 * design mockup so the screen has visible content end-to-end.
 */

// Demo evidence — anonymised case used in the redesign mocks.
// Phase A.2 replaces this with `useCaseEvidence(caseId)`.
const DEMO_EVIDENCE: Record<string, 0 | 1> = {
  '5':  1,  // Risk tools — VRAG flagged invalid (Ewert)
  '6':  1,  // IAC
  '7':  1,  // Bail-WCGP cascade
  '8':  1,  // FASD
  '9':  1,  // IGT / cultural treatment
  '17': 1,  // Over-policing
};

export default function OverviewPage() {
  const inference = useQuery({
    queryKey: ['posterior', 'demo-case'],
    queryFn: () => runInference({ evidence: DEMO_EVIDENCE }),
  });

  const health = useQuery({
    queryKey: ['health'],
    queryFn:  checkHealth,
    staleTime: 5 * 60_000,
  });

  return (
    <>
      <TopBar breadcrumb="Case overview" showPosterior={false} />

      <div className="px-9 py-7">
        {inference.isLoading && <LoadingState />}
        {inference.error    && <ErrorState err={inference.error as Error} />}
        {inference.data     && (
          <OverviewBody
            posterior={inference.data.do_risk}
            posteriors={inference.data.posteriors}
            completeness={inference.data.completeness}
            engineKind={(health.data as { engine?: string } | undefined)?.engine ?? 'unknown'}
          />
        )}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-border bg-paper2 px-6 py-8 text-center">
      <div className="label-caps mb-2">Running Variable Elimination</div>
      <div className="caption-italic">First request may take a moment as pgmpy initialises.</div>
    </div>
  );
}

function ErrorState({ err }: { err: Error }) {
  return (
    <div
      className="rounded-xl px-6 py-6"
      style={{
        background: PV.riskSoft,
        border: `1px solid ${PV.risk}4D`,
      }}
    >
      <div className="label-caps mb-2" style={{ color: PV.risk }}>Backend unreachable</div>
      <div className="caption-italic text-ink2">
        Make sure the FastAPI backend is reachable (set <code className="font-mono">NEXT_PUBLIC_API_BASE</code> in production, or run <code className="font-mono">uvicorn main:app --port 8000</code> locally).
      </div>
      <pre className="mt-3 font-mono text-[11px] text-ink3 whitespace-pre-wrap">{err.message}</pre>
    </div>
  );
}

interface BodyProps {
  posterior:    number;
  posteriors:   Record<string, number>;
  completeness: { observed: number; total_evidence_nodes: number };
  engineKind:   string;
}

function OverviewBody({ posterior, posteriors, completeness, engineKind }: BodyProps) {
  // Top movers — split into risk-side (push designation up) and
  // mitigation-side (pull it down). Orders by posterior magnitude.
  const moversUp   = topMovers(posteriors, ['risk', 'distortion'], 5);
  const moversDown = topMovers(posteriors, ['mitigation', 'special', 'dual'], 5);

  const usingStub = engineKind === 'stub';

  return (
    <>
      {/* Headline */}
      <div
        className="grid pb-6 border-b border-border"
        style={{ gridTemplateColumns: '1.4fr 1fr', gap: 32 }}
      >
        <div>
          {/* Status pill — colour reflects whether stub or real engine is serving */}
          <div
            className="inline-flex items-center gap-2 font-mono font-bold tracking-caps uppercase rounded-full mb-3.5"
            style={{
              padding: '4px 10px',
              fontSize: 10,
              background: usingStub ? PV.constraintSoft : PV.mitigationSoft,
              color: usingStub ? PV.constraint : PV.mitigation,
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 5, height: 5,
                background: usingStub ? PV.constraint : PV.mitigation,
              }}
            />
            {usingStub
              ? 'Stub engine · drop Mk 8 files into parvis_engine/ to activate'
              : 'In progress · last VE run just now'}
          </div>

          <p
            className="font-serif italic text-ink2 leading-relaxed"
            style={{ fontSize: 16, maxWidth: 540 }}
          >
            Posterior probability of{' '}
            <b className="not-italic font-semibold">Dangerous Offender</b>{' '}
            designation under s.753 given current evidence, doctrinal
            corrections, and systemic-distortion adjustments. Models{' '}
            <span
              className="font-semibold not-italic"
              style={{ color: PV.navy }}
            >
              designation risk
            </span>{' '}
            — not intrinsic dangerousness.
          </p>

          <div className="flex gap-6 mt-5">
            <Stat lbl="Doctrinal frame" val="Gladue + Morris" tone={PV.dual} />
            <Stat
              lbl="Completeness"
              val={`${completeness.observed} of ${completeness.total_evidence_nodes} nodes`}
              tone={PV.mitigation}
            />
            <Stat lbl="Network" val="20 nodes" tone={PV.ink3} />
          </div>
        </div>
        <div className="flex justify-end items-start">
          <PosteriorBadge value={posterior} size="lg" />
        </div>
      </div>

      {/* Drivers */}
      <div
        className="grid mt-6"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 36 }}
      >
        <DriverColumn
          title="Driving designation up"
          caption="Top nodes pushing the posterior toward DO designation."
          rows={moversUp}
          direction="up"
        />
        <DriverColumn
          title="Pulling designation down"
          caption="Mitigations, distortion corrections, and causal detectors."
          rows={moversDown}
          direction="down"
        />
      </div>

      {/* What's next */}
      <div
        className="mt-7 rounded-xl border border-border bg-paper2"
        style={{ padding: '18px 22px' }}
      >
        <div className="label-caps mb-3">What's next</div>
        <div
          className="grid"
          style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}
        >
          <NextCard
            color={PV.dual}
            step="Doctrine · 2 of 3"
            title="Finish Risk & distortions"
            body="Three sub-nodes still at default. Posterior will move ±0.04."
          />
          <NextCard
            color={PV.distortion}
            step="Analysis · Appendix Q"
            title="Run quantum diagnostics"
            body="Check for order-effects and connection-gate contextuality."
          />
          <NextCard
            color={PV.output}
            step="Report"
            title="Generate audit report"
            body="One-click export, Tetrad-bound and viva-ready."
          />
        </div>
      </div>
    </>
  );
}

interface Mover { id: string; value: number }

function topMovers(
  posteriors: Record<string, number>,
  types:      string[],
  n:          number,
): Mover[] {
  return Object.entries(posteriors)
    .filter(([id]) => {
      const meta = NODES[id];
      return meta && types.includes(meta.type);
    })
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

interface DriverColumnProps {
  title:     string;
  caption:   string;
  rows:      Mover[];
  direction: 'up' | 'down';
}

function DriverColumn({ title, caption, rows, direction }: DriverColumnProps) {
  const tone = direction === 'up' ? PV.risk : PV.mitigation;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <Glyph
          d={direction === 'up' ? ICON.arrowUp : ICON.arrowDn}
          size={14}
          color={tone}
        />
        <div
          className="font-serif font-medium text-ink"
          style={{ fontSize: 17 }}
        >
          {title}
        </div>
      </div>
      <ItalicCaption>{caption}</ItalicCaption>
      <div>
        {rows.map((r) => (
          <DriverRow key={r.id} id={r.id} value={r.value} direction={direction} />
        ))}
      </div>
    </div>
  );
}