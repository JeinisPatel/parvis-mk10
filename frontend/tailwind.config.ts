import type { Config } from 'tailwindcss';

/**
 * PARVIS Mark 9 — Tailwind config.
 *
 * Palette mirrors the redesign's PV tokens (lib/tokens.ts) so we can use
 * Tailwind utility classes like `bg-paper`, `text-ink`, `border-border2`,
 * and node-family classes like `text-risk`, `bg-distortion-soft`, etc.
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
        // Surfaces — warm cream
        paper:   '#FDFCFA',
        paper2:  '#F7F6F3',
        paper3:  '#F1EFE9',
        paper4:  '#FBFAF7',
        border:  '#ECEAE4',
        border2: '#E0DDD6',
        border3: '#C8C4BC',

        // Text
        ink:     '#1A1A1A',
        ink2:    '#3A3A3A',
        ink3:    '#707070',
        ink4:    '#9E9E9E',

        // Primary
        navy: {
          DEFAULT: '#1B2A4A',
          dim:     'rgba(27,42,74,0.04)',
        },

        // Node families
        risk:        '#A32D2D',
        distortion:  '#185FA5',
        mitigation:  '#3B6D11',
        dual:        '#534AB7',
        special:     '#0F6E56',
        constraint:  '#BA7517',
        output:      '#993C1D',

        // Soft tints — keyed against the family above
        'risk-soft':       '#FBE9E6',
        'distortion-soft': '#E8F0FA',
        'mitigation-soft': '#EAF3DE',
        'dual-soft':       '#EDE7F8',
        'special-soft':    '#DFEEE9',
        'constraint-soft': '#FAEEDA',
      },
      fontFamily: {
        ui:    ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        caps: '0.16em',
      },
    },
  },
  plugins: [],
};

export default config;
