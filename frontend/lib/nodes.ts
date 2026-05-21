/**
 * Canonical Chapter 5 NODE_META — verbatim mirror of backend model.py.
 *
 * Regenerated from backend/parvis_engine/model.py::NODE_META, which is the
 * source of truth and is itself Ch.5-faithful. Supersedes earlier drafts.
 * If model.py NODE_META changes, regenerate this file in the same commit.
 * The /api/v1/architecture endpoint returns this data live.
 *
 * Doctrine: Patel (2026) Ch.5; node 20 computed post-VE per 5.1.20.
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
  id:    string;
  name:  string;
  short: string;
  type:  NodeType;
  ev:    boolean;
}

export const NODES: Record<string, NodeMeta> = {
  // -- Substantive Risk Layer (Ch.5 i) ---------------------------------------
  '1':  { id: '1',  name: 'Criminal law burden of proof',                  short: 'Burden of proof',     type: 'constraint', ev: false },
  '2':  { id: '2',  name: 'Validated risk elevators',                      short: 'Risk elevators',      type: 'risk',       ev: true  },
  '3':  { id: '3',  name: 'Sexual offence risk profile',                   short: 'Sexual offence',      type: 'risk',       ev: true  },
  '4':  { id: '4',  name: 'Dynamic risk factor cluster',                   short: 'Dynamic risk',        type: 'risk',       ev: true  },
  // -- Systemic Distortion & Doctrinal Fidelity Layer (Ch.5 ii) --------------
  '5':  { id: '5',  name: 'Current risk assessment tools',                 short: 'Risk tools',          type: 'distortion', ev: true  },
  '6':  { id: '6',  name: 'Ineffective assistance of counsel',             short: 'IAC',                 type: 'distortion', ev: true  },
  '7':  { id: '7',  name: 'Bail denial → wrongful conviction guilty plea', short: 'Bail-WCGP cascade',   type: 'distortion', ev: true  },
  '8':  { id: '8',  name: 'FASD as dual-factor in risk modeling',          short: 'FASD',                type: 'dual',       ev: true  },
  '9':  { id: '9',  name: 'Intergenerational trauma & cultural treatment', short: 'IGT / treatment',     type: 'mitigation', ev: true  },
  '10': { id: '10', name: 'Judicial misapplication of SCE',                short: 'SCE misapplication',  type: 'distortion', ev: true  },
  '11': { id: '11', name: 'Gaming risk detector',                          short: 'Gaming risk',         type: 'special',    ev: true  },
  '12': { id: '12', name: 'Judicial reasoning reliability',                short: 'Judging the judge',   type: 'distortion', ev: false },
  '13': { id: '13', name: 'Structural systemic bias (TraceRoute)',         short: 'TraceRoute',          type: 'distortion', ev: false },
  '14': { id: '14', name: 'Temporal distortion in prior records',          short: 'Temporal distortion', type: 'distortion', ev: true  },
  '15': { id: '15', name: 'Interjurisdictional tariff distortion',         short: 'Tariff distortion',   type: 'distortion', ev: false },
  '16': { id: '16', name: 'Doctrinal tension (s.718.04 / s.718.2(e))',     short: 'Doctrinal tension',   type: 'distortion', ev: false },
  '17': { id: '17', name: 'Over-policing & epistemic contamination',       short: 'Over-policing',       type: 'distortion', ev: true  },
  '18': { id: '18', name: 'Gladue / Ewert / Morris / Ellis profile',       short: 'SCE profile audit',   type: 'distortion', ev: false },
  '19': { id: '19', name: 'Collider bias',                                 short: 'Collider bias',       type: 'distortion', ev: false },
  // -- 5.1.14 sub-nodes (parents of N14) -------------------------------------
  '14a': { id: '14a', name: 'Sentencing era severity',           short: 'Era severity',          type: 'distortion', ev: true },
  '14b': { id: '14b', name: 'Historical mandatory minimum',      short: 'Mandatory min',         type: 'distortion', ev: true },
  '14c': { id: '14c', name: 'SCE absent at sentencing',          short: 'SCE absent',            type: 'distortion', ev: true },
  '14d': { id: '14d', name: 'Judicial competence absent',        short: 'Comp absent',           type: 'distortion', ev: true },
  // -- 5.1.15 sub-nodes (parents of N15) -------------------------------------
  '15a': { id: '15a', name: 'Tariff jurisdiction disparity',     short: 'Tariff jurisdiction',   type: 'distortion', ev: true },
  '15b': { id: '15b', name: 'Tariff-sensitive offence type',     short: 'Tariff offence',        type: 'distortion', ev: true },
  '15c': { id: '15c', name: 'Tariff-sensitive sentence length',  short: 'Tariff length',         type: 'distortion', ev: true },
  '15d': { id: '15d', name: 'Jurisprudential compliance absent', short: 'Doctrine absent',       type: 'distortion', ev: true },
  // -- 5.1.17 sub-nodes (parents of N17) -------------------------------------
  '17a': { id: '17a', name: 'Jurisdictional policing disparity', short: 'Disparity',             type: 'distortion', ev: true },
  '17b': { id: '17b', name: 'Enforcement-disparity engagement',  short: 'Engagement',            type: 'distortion', ev: true },
  '17c': { id: '17c', name: 'Non-violent charge density',        short: 'Non-violent',           type: 'distortion', ev: true },
  '17d': { id: '17d', name: 'Surveillance-triggered entries',    short: 'Surveillance',          type: 'distortion', ev: true },
  // -- 5.1.18 sub-nodes (parents of N18 — Tetrad / SCE-profile audit) --------
  '18a': { id: '18a', name: 'Jurisdiction SCE-integration sensitivity', short: 'Jurisdiction sensitivity', type: 'distortion', ev: true },
  '18b': { id: '18b', name: 'SCE presence in reasons',           short: 'SCE presence',          type: 'distortion', ev: true },
  '18c': { id: '18c', name: 'SCE substance',                     short: 'SCE substance',         type: 'distortion', ev: true },
  '18d': { id: '18d', name: 'Doctrinal tagging compliance',      short: 'Doctrinal tagging',     type: 'distortion', ev: true },
  // -- Structural Output (Ch.5 iii) ------------------------------------------
  '20': { id: '20', name: 'Dangerous offender designation',      short: 'DO designation',        type: 'output',     ev: false },
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
