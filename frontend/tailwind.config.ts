import type { Config } from 'tailwindcss';

/**
 * PARVIS Mark 10 — Tailwind config (RATIO design language).
 *
 * Palette mirrors lib/tokens.ts so utility classes keep working unchanged:
 * `bg-paper`, `bg-ground`, `text-ink`, `border-border2`, and node-family
 * classes like `text-risk`, `bg-distortion-soft`. The hex values are repointed
 * onto RATIO's warm ivory + slate world with the muted Mk 10 families.
 */

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        ground:  '#F4F1EA',
        paper:   '#FCFBF7',
        paper2:  '#EFEBE2',
        paper3:  '#E7E2D7',
        paper4:  '#FAF8F2',
        border:  '#E3DED2',
        border2: '#DCD6CA',
        border3: '#C9C1B2',

        // Text
        ink:     '#1F1D1A',
        ink2:    '#423E37',
        ink3:    '#736D62',
        ink4:    '#938C7F',

        // Primary accent — slate (navy kept as alias for back-compat)
        slate: {
          DEFAULT: '#324153',
          strong:  '#222C38',
          tint:    '#E3E7EC',
        },
        navy: {
          DEFAULT: '#324153',
          dim:     'rgba(50,65,83,0.04)',
        },

        // Tension — claret (reserved, not a family)
        claret: {
          DEFAULT: '#7C3B43',
          soft:    '#EFE3E1',
        },

        // Node families — muted Mk 10 set
        risk:        '#9E5147',
        distortion:  '#4E6A85',
        mitigation:  '#5E7048',
        dual:        '#6B5E86',
        special:     '#3F6E62',
        constraint:  '#9C7034',
        output:      '#8C5238',

        // Soft tints
        'risk-soft':       '#F0E4E1',
        'distortion-soft': '#E5EAEF',
        'mitigation-soft': '#EAEDE0',
        'dual-soft':       '#EAE6EF',
        'special-soft':    '#E2EBE7',
        'constraint-soft': '#F0E9DC',
        'output-soft':     '#EFE5DF',
      },
      fontFamily: {
        ui:    ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono:  ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        caps: '0.14em',
      },
    },
  },
  plugins: [],
};

export default config;
