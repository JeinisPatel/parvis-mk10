/**
 * PARVIS Mark 9 — palette + font tokens.
 *
 * The same PV palette used in the redesign mocks, exposed as TS constants
 * for components that need raw values (inline styles, SVG fills, etc.).
 * Tailwind utility classes (bg-paper, text-risk) are preferred everywhere
 * Tailwind can express the intent; tokens are the escape hatch.
 */

export const PV = {
  // Surfaces
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
  navy:    '#1B2A4A',

  // Node families
  risk:        '#A32D2D',
  distortion:  '#185FA5',
  mitigation:  '#3B6D11',
  dual:        '#534AB7',
  special:     '#0F6E56',
  constraint:  '#BA7517',
  output:      '#993C1D',

  // Soft tints
  riskSoft:        '#FBE9E6',
  distortionSoft:  '#E8F0FA',
  mitigationSoft:  '#EAF3DE',
  dualSoft:        '#EDE7F8',
  specialSoft:     '#DFEEE9',
  constraintSoft:  '#FAEEDA',
} as const;

export type NodeType =
  | 'constraint' | 'risk' | 'distortion' | 'mitigation'
  | 'dual'       | 'special' | 'output';

export const COLOR_FOR_TYPE: Record<NodeType, string> = {
  constraint: PV.constraint,
  risk:       PV.risk,
  distortion: PV.distortion,
  mitigation: PV.mitigation,
  dual:       PV.dual,
  special:    PV.special,
  output:     PV.output,
};
