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

/**
 * Band colours. "High" reaches for the reserved claret rather than the risk
 * family — this is the one place a posterior is in genuine tension (pushing
 * toward the DO designation), so it earns the tension signal. Everything
 * below stays in the calm slate / muted-family register.
 */
function band(v: number): Band {
  if (v < 0.20) return { lbl: 'Very low', fg: PV.mitigation, bg: PV.mitigationSoft };
  if (v < 0.40) return { lbl: 'Low',      fg: PV.mitigation, bg: PV.mitigationSoft };
  if (v < 0.55) return { lbl: 'Moderate', fg: PV.constraint, bg: PV.constraintSoft };
  if (v < 0.70) return { lbl: 'Elevated', fg: PV.constraint, bg: PV.constraintSoft };
  return                 { lbl: 'High',     fg: PV.claret,     bg: PV.claretSoft };
}

/**
 * PosteriorBadge — the always-visible N20 readout.
 *
 * Renders the DO designation risk as a banded badge: number + qualitative
 * label + provenance string. `sm` is the top-bar variant; `lg` is the
 * dashboard hero. Type is RATIO's: IBM Plex Sans label, IBM Plex Mono figure,
 * Source Serif italic qualifier.
 */
export function PosteriorBadge({ value, size = 'sm', label = 'DO designation risk' }: Props) {
  const b = band(value);
  const lg = size === 'lg';
  return (
    <div
      style={{
        background:   b.bg,
        border:       `1px solid ${b.fg}33`,
        borderRadius: 10,
        padding:      lg ? '18px 22px' : '10px 14px',
        textAlign:    'center',
        minWidth:     lg ? 240 : undefined,
      }}
    >
      <div
        style={{
          fontFamily:    '"IBM Plex Sans", system-ui, sans-serif',
          fontSize:      lg ? 11 : 9.5,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color:         b.fg,
          fontWeight:    600,
          marginBottom:  6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
          fontSize:   lg ? 44 : 26,
          fontWeight: 500,
          color:      b.fg,
          lineHeight: 1,
        }}
      >
        {(value * 100).toFixed(1)}
        <span style={{ fontSize: lg ? 22 : 14, opacity: 0.7 }}>%</span>
      </div>
      <div
        style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
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
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
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
