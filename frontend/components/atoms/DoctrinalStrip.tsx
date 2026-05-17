import type { ReactNode } from 'react';
import { PV } from '@/lib/tokens';

interface Props {
  /** Accent colour (left border + bold label). Defaults to distortion blue. */
  color?:  string;
  /** Background fill; pairs with `color`. Defaults to distortionSoft. */
  bg?:     string;
  /** Bold label rendered before the body — e.g. "Ewert v Canada [2018] 2 SCR 165". */
  label?:  ReactNode;
  children: ReactNode;
}

/**
 * DoctrinalStrip — the callout pattern for binding/persuasive authorities.
 *
 * Used throughout the Doctrine and Analysis screens to anchor a claim to
 * a specific case or statutory provision. The left border is a 3px stripe
 * in the family colour (distortion/risk/mitigation depending on what the
 * authority does to the posterior).
 */
export function DoctrinalStrip({
  color = PV.distortion,
  bg,
  label,
  children,
}: Props) {
  return (
    <div
      className="rounded-md"
      style={{
        background: bg ?? PV.distortionSoft,
        border: `1px solid ${color}33`,
        borderLeft: `3px solid ${color}`,
        padding: '10px 16px',
        fontSize: 12.5,
        color: PV.ink2,
        lineHeight: 1.55,
        maxWidth: 880,
      }}
    >
      {label && (
        <strong style={{ color, fontWeight: 700, marginRight: 8 }}>{label}</strong>
      )}
      {children}
    </div>
  );
}
