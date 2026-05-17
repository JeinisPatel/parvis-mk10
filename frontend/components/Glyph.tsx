/**
 * Glyph — inline SVG icon family.
 *
 * Ported verbatim from the design mockup (screens/tokens.jsx). Stroke-only,
 * 24×24 viewBox, consistent stroke-width via the `stroke` prop. Used in the
 * Sidebar (per-item icons), Doctrine screens (section headings), Mobile
 * bottom-nav, and inline alongside section titles.
 *
 * Usage:
 *   <Glyph d={ICON.profile} />
 *   <Glyph d={ICON.chat} size={18} color="#185FA5" stroke={2} />
 */

interface Props {
  /** Path data — pick from the `ICON` map below. */
  d:       string;
  /** Square pixel size; default 14. */
  size?:   number;
  /** Stroke colour; default inherits `currentColor`. */
  color?:  string;
  /** Stroke width; default 1.6. */
  stroke?: number;
}

export function Glyph({ d, size = 14, color = 'currentColor', stroke = 1.6 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto' }}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export const ICON = {
  profile:   'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  chat:      'M21 12a8 8 0 1 1-3-6.2L21 4l-1 4.5A8 8 0 0 1 21 12z',
  record:    'M6 4h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM14 4v6h6',
  doc:       'M8 4h7l5 5v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM14 4v6h6M9 14h6M9 17h4',
  feather:   'M20.2 4a6 6 0 0 0-8.5 0L4 11.7V20h8.3l7.7-7.7a6 6 0 0 0 .2-8.3zM4 20l9-9',
  scale:     'M12 3v18M5 7l-3 6a4 4 0 0 0 6 0L5 7zm14 0l-3 6a4 4 0 0 0 6 0l-3-6zM3 21h18',
  shield:    'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  spark:     'M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4',
  layers:    'M12 3l9 4-9 4-9-4 9-4zM3 11l9 4 9-4M3 15l9 4 9-4',
  atom:      'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M4 12c0-4 3-7 8-7s8 3 8 7-3 7-8 7-8-3-8-7zM4 12c4 3 12 3 16 0M4 12c4-3 12-3 16 0',
  report:    'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h6M8 13h8M8 17h5M8 9h4',
  net:       'M5 5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M5 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 19a2 2 0 1 0 4 0 2 2 0 1 0-4 0M9 6h6M9 18h6M7 7v10M17 7v10M9 6l8 12M15 6l-8 12',
  search:    'M11 11m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M21 21l-5.2-5.2',
  plus:      'M12 5v14M5 12h14',
  chevR:     'M9 6l6 6-6 6',
  chevD:     'M6 9l6 6 6-6',
  check:     'M5 12l5 5L20 7',
  arrowUp:   'M12 19V5M5 12l7-7 7 7',
  arrowDn:   'M12 5v14M5 12l7 7 7-7',
  dot:       'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  menu:      'M4 6h16M4 12h16M4 18h16',
  close:     'M6 6l12 12M18 6L6 18',
  upload:    'M12 16V4M5 11l7-7 7 7M5 20h14',
  download:  'M12 4v12M5 13l7 7 7-7M5 4h14',
  filter:    'M3 5h18l-7 8v6l-4-2v-4z',
  send:      'M3 21l18-9L3 3v7l13 2-13 2z',
  mic:       'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4',
  history:   'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  link:      'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  warn:      'M12 3l10 17H2L12 3zM12 10v5M12 18v.1',
} as const;

export type IconName = keyof typeof ICON;
