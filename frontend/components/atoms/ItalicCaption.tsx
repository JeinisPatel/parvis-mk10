import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional override; falls back to the ink3 (ink-500) grey from the palette. */
  color?:  string;
  /** Pixel size; default 12.5. */
  size?:   number;
}

/**
 * ItalicCaption — Source Serif italic, used immediately under section titles
 * and as the supporting micro-copy throughout. There's a Tailwind
 * `.caption-italic` utility for the common case; this component is for places
 * that need a size or colour override. Default colour is the RATIO ink-500.
 */
export function ItalicCaption({ children, color, size = 12.5 }: Props) {
  return (
    <div
      className="font-serif italic leading-[1.55] mt-[-2px] mb-2.5"
      style={{ fontSize: size, color: color ?? '#736D62' }}
    >
      {children}
    </div>
  );
}
