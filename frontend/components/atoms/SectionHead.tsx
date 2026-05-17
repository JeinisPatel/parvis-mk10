import type { ReactNode } from 'react';
import { PV } from '@/lib/tokens';

interface Props {
  /** Vertical accent-bar colour. Pass a `PV.*` token. */
  color:     string;
  title:     string;
  subtitle?: ReactNode;
  /** Optional mono-tag rendered inline after the title (e.g. doctrine cite). */
  tags?:     ReactNode;
}

/**
 * SectionHead — the canonical section-opener pattern.
 *
 * Two-column grid: a 4px-wide colour bar on the left, then a serif title
 * with an optional inline mono tag and an italic-serif subtitle. Used at
 * the top of every major section on the Doctrine and Analysis screens.
 *
 *   ▍  Risk & distortions  s.753 CC
 *      Three sub-nodes still at default. Posterior will move ±0.04.
 */
export function SectionHead({ color, title, subtitle, tags }: Props) {
  return (
    <div
      className="grid items-baseline mb-3.5 pb-2 border-b"
      style={{ gridTemplateColumns: '8px 1fr', gap: 14, borderColor: PV.border }}
    >
      <div
        style={{
          width: 4, height: 22, borderRadius: 2, alignSelf: 'center', background: color,
        }}
      />
      <div>
        <div
          className="font-serif font-medium text-ink"
          style={{ fontSize: 17, letterSpacing: '-0.005em' }}
        >
          {title}
          {tags && (
            <span className="font-mono font-medium text-ink3 ml-2.5" style={{ fontSize: 11 }}>
              {tags}
            </span>
          )}
        </div>
        {subtitle && (
          <div
            className="font-serif italic text-ink3 mt-0.5"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
