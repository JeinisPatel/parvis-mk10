import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional override; falls back to the ink3 grey from the palette. */
  color?:  string;
  /** Pixel size; default 12.5 to match the mockup. */
  size?:   number;
}

/**
 * ItalicCaption — Fraunces italic, used immediately under SectionHead titles
 * and as the supporting micro-copy throughout the redesign. There's a Tailwind
 * `.caption-italic` utility for the common case; this component is for places
 * that need a size or color override.
 */
export function ItalicCaption({ children, color, size = 12.5 }: Props) {
  return (
    <div
      className="font-serif italic leading-[1.55] mt-[-2px] mb-2.5"
      style={{ fontSize: size, color: color ?? '#707070' }}
    >
      {children}
    </div>
  );
}
