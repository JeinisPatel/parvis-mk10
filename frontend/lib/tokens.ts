/**
 * PARVIS Mark 10 — palette + font tokens (RATIO design language).
 *
 * The PV palette is repointed onto RATIO's world: a warm ivory ground, a
 * near-black warm ink scale, a single restrained slate accent, and claret
 * reserved ONLY for genuine tension (a node crossing the BRD threshold).
 * The node families are the muted "law-report-spine" set agreed for Mk 10 —
 * each keeps its hue identity but desaturated and tonally harmonised so none
 * shouts against the paper.
 *
 * Tailwind utility classes (bg-paper, text-risk, border-border2) are preferred
 * wherever Tailwind can express the intent; these constants are the escape
 * hatch for inline styles and SVG fills. The export SHAPE is unchanged from
 * Mk 9 (PV, NodeType, COLOR_FOR_TYPE) so nothing downstream breaks.
 */

export const PV = {
  // Surfaces — warm ivory ground, lighter cards resting on it (paper-on-paper)
  ground:  '#F4F1EA',  // app body ground (RATIO --paper)
  paper:   '#FCFBF7',  // primary surface / cards (RATIO --card)
  paper2:  '#EFEBE2',  // secondary surface — sidebar, headers (sunken-ish)
  paper3:  '#E7E2D7',  // sunken / active row
  paper4:  '#FAF8F2',  // raised hover

  border:  '#E3DED2',  // soft hairline
  border2: '#DCD6CA',  // default hairline (RATIO --line)
  border3: '#C9C1B2',  // strong hairline (RATIO --line-strong)

  // Warm neutral ink scale
  ink:     '#1F1D1A',  // ink-900
  ink2:    '#423E37',  // ink-700
  ink3:    '#736D62',  // ink-500
  ink4:    '#938C7F',  // ink-400

  // Primary accent — slate. `navy` retained as an alias so Mk 9 callers that
  // reference PV.navy keep resolving; it now points at the slate accent.
  slate:        '#324153',
  slateStrong:  '#222C38',
  slateTint:    '#E3E7EC',
  navy:         '#324153',  // alias → slate (back-compat)

  // Tension — claret. Reserved; NOT a family colour.
  claret:      '#7C3B43',
  claretSoft:  '#EFE3E1',

  // Node families — muted set (Mk 10)
  risk:        '#9E5147',
  distortion:  '#4E6A85',
  mitigation:  '#5E7048',
  dual:        '#6B5E86',
  special:     '#3F6E62',
  constraint:  '#9C7034',
  output:      '#8C5238',

  // Soft tints — warm, paper-adjacent
  riskSoft:        '#F0E4E1',
  distortionSoft:  '#E5EAEF',
  mitigationSoft:  '#EAEDE0',
  dualSoft:        '#EAE6EF',
  specialSoft:     '#E2EBE7',
  constraintSoft:  '#F0E9DC',
  outputSoft:      '#EFE5DF',
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
