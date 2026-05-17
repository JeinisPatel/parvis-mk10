import type { ReactNode } from 'react';
import { PV } from '@/lib/tokens';

interface Props {
  /** Phase accent colour; pass a `PV.*` token (dual / distortion / output). */
  color: string;
  /** Mono uppercase eyebrow — e.g. "Doctrine · 2 of 3". */
  step:  string;
  /** Serif title — short imperative ("Run quantum diagnostics"). */
  title: string;
  /** Italic-serif body — one sentence explaining why this matters next. */
  body:  ReactNode;
}

/**
 * NextCard — the recommended-action card used in the Overview "What's next"
 * panel. Left edge is a 3px coloured stripe in the phase colour.
 */
export function NextCard({ color, step, title, body }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border bg-paper px-4 py-3.5"
      style={{ borderColor: PV.border }}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 3, background: color }}
      />
      <div className="label-caps mb-1.5" style={{ color }}>
        {step}
      </div>
      <div
        className="font-serif font-medium mb-1 text-ink"
        style={{ fontSize: 16 }}
      >
        {title}
      </div>
      <div className="caption-italic">{body}</div>
    </div>
  );
}
