import { PV } from '@/lib/tokens';

interface Props {
  /** 0–100 fill percentage. */
  pct:     number;
  /** Fill colour; pass a `PV.*` token. */
  color?:  string;
  /** Track height in px; default 4. */
  height?: number;
  /** Track (background) colour; default a warm paper grey. */
  bg?:     string;
}

/**
 * MiniBar — a 4-pixel-tall percentage track. Used for completeness rows,
 * confidence indicators on doctrine factors, and per-node weighting
 * sliders in the Risk & distortions screen.
 */
export function MiniBar({ pct, color = PV.navy, height = 4, bg = PV.paper3 }: Props) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        height,
        background: bg,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 240ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}
