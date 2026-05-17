import type { ReactNode } from 'react';

/**
 * Caselaw — inline italic serif for case names. Use in body text to render
 * something like:  As established in <Caselaw>R v Ipeelee</Caselaw>, ...
 *
 * Renders as an <em> so it inherits the surrounding prose's emphasis stack
 * correctly (nested italic flips to roman per the typographic convention).
 */
export function Caselaw({ children }: { children: ReactNode }) {
  return (
    <em
      className="font-serif italic text-ink"
      style={{ fontStyle: 'italic' }}
    >
      {children}
    </em>
  );
}
