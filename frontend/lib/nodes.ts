/**
 * Canonical Chapter 5 NODE_META — verbatim mirror of backend Mk 8 model.py.
 *
 * This file is the authoritative TypeScript reference for node identity,
 * family (type), short labels, and evidence-bearing status. It is mirrored
 * from `backend/parvis_engine/model.py::NODE_META`.
 *
 * If model.py NODE_META changes, this file changes with it in the same commit.
 * The /api/v1/architecture endpoint also returns this data live, so most
 * components should prefer the API response over this static mirror — but
 * this file provides type-safe access at build time and for components that
 * render before the architecture call resolves.
 *
 * Doctrine: Patel (2026) Ch.5; node 20 is computed post-VE per §5.1.20.
 */

export type NodeType =
  | 'constraint'
  | 'risk'
  | 'distortion'
  | 'mitigation'
  | 'dual'
  | 'special'
  | 'output';

export interface NodeMeta {
  id:    number;
  name:  string;
  short: string;
  type:  NodeType;
  ev:    boolean;
}

export const NODES: Record<string, NodeMeta> = {
  '1':  { id: 1,  name: 'Criminal law burden of proof',                short: 'Burden of proof',         type: 'constraint', ev: false },
  '2':  { id: 2,  name: 'Serious violence / violent history',           short: 'Violent history',         type: 'risk',       ev: true  },
  '3':  { id: 3,  name: 'Validated psychopathy (PCL-R)',                short: 'Psychopathy (PCL-R)',     type: 'risk',       ev: true  },
  '4':  { id: 4,  name: 'Sexual offence profile (Static-99R)',          short: 'Sexual offence',          type: 'risk',       ev: true  },
  '5':  { id: 5,  name: 'Culturally invalid risk tools',                short: 'Invalid risk tools',      type: 'distortion', ev: true  },
  '6':  { id: 6,  name: 'Ineffective assistance of counsel',            short: 'Ineffective counsel',     type: 'distortion', ev: true  },
  '7':  { id: 7,  name: 'Bail-denial → wrongful guilty plea',           short: 'Bail-denial cascade',     type: 'distortion', ev: true  },
  '8':  { id: 8,  name: 'King credibility impeachment',                 short: 'King impeachment',        type: 'distortion', ev: false },
  '9':  { id: 9,  name: 'FASD — dual factor node',                      short: 'FASD',                    type: 'dual',       ev: true  },
  '10': { id: 10, name: 'Intergenerational trauma',                     short: 'Intergenerational trauma',type: 'mitigation', ev: true  },
  '11': { id: 11, name: 'Absence of culturally grounded treatment',     short: 'No cultural treatment',   type: 'distortion', ev: true  },
  '12': { id: 12, name: 'Judicial misapplication of Gladue tetrad',     short: 'Gladue misapplication',   type: 'distortion', ev: true  },
  '13': { id: 13, name: 'Gaming risk detector',                         short: 'Gaming risk',             type: 'special',    ev: true  },
  '14': { id: 14, name: 'Over-policing & epistemic contamination',      short: 'Over-policing',           type: 'distortion', ev: true  },
  '15': { id: 15, name: 'Temporal distortion',                          short: 'Temporal distortion',     type: 'distortion', ev: true  },
  '16': { id: 16, name: 'Interjurisdictional tariff effects',           short: 'Tariff disparities',      type: 'distortion', ev: false },
  '17': { id: 17, name: 'Collider bias',                                short: 'Collider bias',           type: 'distortion', ev: false },
  '18': { id: 18, name: 'Dynamic risk factors',                         short: 'Dynamic risk',            type: 'risk',       ev: true  },
  '19': { id: 19, name: 'Absence of rehabilitative progress',           short: 'No rehabilitation',       type: 'distortion', ev: false },
  '20': { id: 20, name: 'Dangerous offender designation risk',          short: 'DO designation risk',     type: 'output',     ev: false },
};

export const TYPE_COLORS: Record<NodeType, string> = {
  constraint: '#BA7517',
  risk:       '#A32D2D',
  distortion: '#185FA5',
  mitigation: '#3B6D11',
  dual:       '#534AB7',
  special:    '#0F6E56',
  output:     '#993C1D',
};

export function nodeColor(id: string | number): string {
  const meta = NODES[String(id)];
  return meta ? TYPE_COLORS[meta.type] : '#76736B';
}

export const EVIDENCE_NODE_IDS: readonly string[] = Object.freeze(
  Object.keys(NODES).filter((id) => NODES[id].ev),
);