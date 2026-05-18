'use client';

import { useQuery } from '@tanstack/react-query';
import { runInference } from '@/lib/api';
import { NodeTag } from './NodeTag';
import { PosteriorBadge } from './PosteriorBadge';
import { PV } from '@/lib/tokens';

interface Delta {
  /** Node id whose value moved (e.g. "3"). */
  id:    string;
  /** Short human-readable description of the change. */
  short: string;
  /** Signed display string for the posterior delta — e.g. "+0.05". */
  v:     string;
}

interface FrameItem {
  label: string;
  /** Three-state: 'engaged' (mitigation green), 'pending' (dual purple), 'n/a' (struck-through grey). */
  state: 'engaged' | 'pending' | 'na';
}

interface Props {
  /** Recent posterior deltas to render under the badge. */
  recent?: Delta[];
  /** Doctrinal-frame engagement state. */
  frame?:  FrameItem[];
}

/**
 * LivePosteriorRail — sticky right-rail for input screens (Profile, Chat,
 * Criminal record, Documents, Gladue, SCE). Always-visible posterior + the
 * last few moves + which doctrinal frames are currently engaged.
 *
 * Compose like:
 *
 *   <div className="grid grid-cols-[1fr_300px] gap-7">
 *     <main>…input form…</main>
 *     <LivePosteriorRail recent={…} frame={…} />
 *   </div>
 *
 * The posterior is fetched via the same `['posterior', 'demo-case']` query
 * key as the TopBar, so they update together and React Query dedupes the
 * request across the page.
 */
export function LivePosteriorRail({
  recent = DEFAULT_DELTAS,
  frame  = DEFAULT_FRAME,
}: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posterior', 'current'],
    queryFn: () => runInference({ evidence: DEMO_EVIDENCE }),
    staleTime: Infinity,
  });

  const posterior = data?.do_risk ?? 0.5;

  return (
    <aside
      className="self-start sticky top-0 rounded-xl bg-paper2 border border-border"
      style={{ padding: '20px 18px' }}
    >
      <div className="label-caps mb-3">Live posterior</div>

      {isLoading ? (
        <div className="font-mono text-[11px] text-ink3">running VE…</div>
      ) : error ? (
        <div className="font-mono text-[11px] text-risk">backend unreachable</div>
      ) : (
        <PosteriorBadge value={posterior} size="sm" />
      )}

      {/* Recent deltas */}
      <div
        className="mt-4 pt-3.5"
        style={{ borderTop: `1px solid ${PV.border}` }}
      >
        <div className="label-caps mb-2.5">Recent deltas</div>
        {recent.map((d, i) => (
          <div
            key={`${d.id}-${i}`}
            className="flex items-center gap-2 py-1 text-[12px]"
          >
            <NodeTag id={d.id} small />
            <span className="flex-1 text-ink2">{d.short}</span>
            <span
              className="font-mono font-semibold tabular-nums"
              style={{
                fontSize: 11,
                color: d.v.trim().startsWith('+') ? PV.risk : PV.mitigation,
              }}
            >
              {d.v}
            </span>
          </div>
        ))}
      </div>

      {/* Doctrinal frame */}
      <div
        className="mt-4 pt-3.5"
        style={{ borderTop: `1px solid ${PV.border}` }}
      >
        <div className="label-caps mb-2.5">Doctrinal frame</div>
        {frame.map((f) => (
          <FrameRow key={f.label} {...f} />
        ))}
      </div>
    </aside>
  );
}

function FrameRow({ label, state }: FrameItem) {
  const dot =
    state === 'engaged' ? PV.mitigation :
    state === 'na'      ? PV.ink4 :
                           PV.dual;
  const opacity = state === 'na' ? 0.5 : 1;
  return (
    <div className="flex items-center gap-2 py-1 text-[12px]">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: dot, opacity }}
        aria-hidden
      />
      <span
        className={state === 'na' ? 'text-ink4 line-through' : 'text-ink2'}
      >
        {label}
      </span>
      <span className="flex-1" />
      <span
        className="font-mono tabular-nums text-ink4"
        style={{ fontSize: 10 }}
      >
        {state === 'engaged' ? 'engaged' : state === 'na' ? 'n/a' : 'pending'}
      </span>
    </div>
  );
}

// ── Defaults — placeholder fixtures matching the redesign mock ─────────────

const DEMO_EVIDENCE: Record<string, 0 | 1> = {
  '5': 1, '6': 1, '7': 1, '8': 1, '9': 1, '17': 1,
};

const DEFAULT_DELTAS: Delta[] = [
  { id: '3',  short: 'PCL-R 24 → 28',     v: '+0.05' },
  { id: '14', short: 'Age 52 → 56',       v: '−0.03' },
  { id: '8',  short: 'FASD confirmed',    v: '−0.04' },
];

const DEFAULT_FRAME: FrameItem[] = [
  { label: 'Gladue (s.718.2(e))', state: 'engaged' },
  { label: 'Morris IRCA',         state: 'pending' },
  { label: 'Ellis disadvantage',  state: 'pending' },
  { label: 'Ewert caveat',        state: 'na'      },
];
