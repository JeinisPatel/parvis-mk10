import { PV } from '@/lib/tokens';

interface Props {
  value: number;          // 0..1
  size?: 'sm' | 'lg';
  label?: string;
}

interface Band {
  lbl: string;
  fg:  string;
  bg:  string;
}

function band(v: number): Band {
  if (v < 0.20) return { lbl: 'Very low',  fg: PV.mitigation, bg: PV.mitigationSoft };
  if (v < 0.40) return { lbl: 'Low',       fg: PV.mitigation, bg: PV.mitigationSoft };
  if (v < 0.55) return { lbl: 'Moderate',  fg: PV.constraint, bg: PV.constraintSoft };
  if (v < 0.70) return { lbl: 'Elevated',  fg: PV.constraint, bg: PV.constraintSoft };
  return                 { lbl: 'High',      fg: PV.risk,        bg: PV.riskSoft };
}

/**
 * PosteriorBadge — the always-visible N20 readout.
 *
 * Renders the DO designation risk as a banded badge: number + qualitative
 * label + provenance string. `sm` is the top-bar variant; `lg` is the
 * dashboard hero.
 */
export function PosteriorBadge({ value, size = 'sm', label = 'DO designation risk' }: Props) {
  const b = band(value);
  const lg = size === 'lg';
  return (
    <div
      style={{
        background: b.bg,
        border:     `1px solid ${b.fg}33`,
        borderRadius: 14,
        padding:    lg ? '18px 22px' : '10px 14px',
        textAlign:  'center',
        minWidth:   lg ? 240 : undefined,
      }}
    >
      <div
        style={{
          fontFamily:     'var(--font-ui)',
          fontSize:       lg ? 11 : 9.5,
          textTransform:  'uppercase',
          letterSpacing:  '0.14em',
          color:          b.fg,
          fontWeight:     700,
          marginBottom:   6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
          fontSize:   lg ? 44 : 26,
          fontWeight: 600,
          color:      b.fg,
          lineHeight: 1,
        }}
      >
        {(value * 100).toFixed(1)}
        <span style={{ fontSize: lg ? 22 : 14, opacity: 0.7 }}>%</span>
      </div>
      <div
        style={{
          fontFamily: 'Fraunces, Georgia, serif',
          fontStyle:  'italic',
          fontSize:   lg ? 15 : 12,
          color:      b.fg,
          marginTop:  4,
        }}
      >
        {b.lbl}
      </div>
      {lg && (
        <div
          style={{
            fontSize:   10,
            color:      b.fg,
            opacity:    0.78,
            marginTop:  8,
            lineHeight: 1.4,
          }}
        >
          pgmpy Variable Elimination · Tetrad-bound
        </div>
      )}
    </div>
  );
}
