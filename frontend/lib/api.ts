/**
 * Typed API client for the PARVIS Mk 9 FastAPI backend.
 *
 * All requests go through Next.js's /api proxy (see next.config.mjs) which
 * forwards to http://localhost:8000 in dev. In production the proxy points
 * at the deployed backend.
 */

export interface InferenceRequest {
  evidence:           Record<string, 0 | 1>;
  collider_discount?: boolean;
}

export interface SoftInferenceRequest {
  evidence:           Record<string, 0 | 1>;
  shifts:             Record<string, number>;
  collider_discount?: boolean;
}

export interface InferenceResponse {
  posteriors:                   Record<string, number>;
  do_risk:                       number;
  do_risk_collider_discounted:  number | null;
  completeness: {
    observed:              number;
    total_evidence_nodes:  number;
  };
  shifts_applied?:              Record<string, number>;
}

export interface FamilyContributionNode {
  id:            string;
  weight:        number;
  posterior:     number;
  contribution:  number;
}

export interface FamilyContribution {
  family:               string;
  label:                string;
  color:                string;
  sign:                 'up' | 'down';
  weight_sum:           number;
  signed_contribution:  number;
  nodes:                FamilyContributionNode[];
}

export interface DecomposedInferenceResponse extends InferenceResponse {
  families:         FamilyContribution[];
  saturated_nodes:  string[];
  provenance:       string;
}

// ── Quantum (Appendix Q) types ──────────────────────────────────────────────

export interface BlochAngles {
  theta:  number;
  phi:    number;
  x:      number;
  y:      number;
  z:      number;
}

export interface DiagnosticAxis {
  flagged:       boolean;
  severity:      'high' | 'moderate' | 'none' | 'not_run';
  items?:        unknown[];
  doctrine?:     string;
  note?:         string;
  delta?:        number;
  permutations?: unknown[];
  gates_tested?: unknown[];
}

export interface QuantumRequest {
  evidence:              Record<string, 0 | 1>;
  shifts:                Record<string, number>;
  gladue_checked?:       string[];
  sce_checked?:          string[];
  profile_ev?:           Record<string, number>;
  connection_strength?:  'weak' | 'moderate' | 'strong';
}

export interface QuantumResponse {
  do_risk:                        number;
  p_high:                         number;
  classical_posteriors:           Record<string, number>;
  angles:                         BlochAngles;
  prior_contamination:            DiagnosticAxis;
  order_effects:                  DiagnosticAxis;
  contextual_interference:        DiagnosticAxis;
  belief_stasis:                  DiagnosticAxis;
  order_stability:                DiagnosticAxis;
  connection_gate_contextuality:  DiagnosticAxis;
  superposition_index:            number;
  superposition_note:             string;
  overall_flag:                   'high' | 'moderate' | 'none';
  summary:                        string;
}

// ── Criminal record types ───────────────────────────────────────────────────

export interface Conviction {
  id:                         string;
  charge:                     string;
  category:                   string;
  year:                       number | null;
  jurisdiction:               string;
  sentence_type:              string;
  sentence_length_months:     number | null;
  bail_denied:                boolean;
  counsel_inadequate:         boolean;
  overpoliced_jurisdiction:   boolean;
  plea_under_pressure:        boolean;
  notes:                      string;
}

export interface RecordImplication {
  node:       string;
  node_name:  string;
  type:       'advisory' | 'strong';
  note:       string;
  anchor:     string;
}

export interface RecordAggregate {
  count:             number;
  violent_count:     number;
  sexual_count:      number;
  weight_sum:        number;
  weight_mean:       number;
  earliest_year:     number | null;
  most_recent_year:  number | null;
  span_years:        number | null;
}

export interface RecordAnalysisResponse {
  pattern:         'escalating' | 'stable' | 'de_escalating' | 'desistance' | 'insufficient';
  pattern_note:    string;
  aggregate:       RecordAggregate;
  implications:    RecordImplication[];
  categories:      Record<string, string>;
  sentence_types:  string[];
}

export interface RecordMetadataResponse {
  categories:      Record<string, string>;
  sentence_types:  string[];
}

// ── Architecture / health ───────────────────────────────────────────────────

export interface ArchitectureNode {
  id:                string;
  name:              string;
  short:             string;
  type:              'constraint' | 'risk' | 'distortion' | 'mitigation' | 'dual' | 'special' | 'output';
  evidence_bearing:  boolean;
}

export interface ArchitectureEdge {
  from:  string;
  to:    string;
}

export interface ArchitectureResponse {
  nodes:  ArchitectureNode[];
  edges:  ArchitectureEdge[];
}

export interface HealthResponse {
  ok:      boolean;
  engine:  'model' | 'stub' | 'uninitialised';
}


// ── Helpers ──────────────────────────────────────────────────────────────────

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.detail) detail = `${res.status} ${j.detail}`;
    } catch { /* body wasn't JSON */ }
    throw new Error(`Request failed: ${detail}`);
  }
  return res.json() as Promise<T>;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}


// ── Public API ───────────────────────────────────────────────────────────────

export function runInference(req: InferenceRequest): Promise<InferenceResponse> {
  return postJSON<InferenceResponse>('/api/v1/inference', req);
}

export function runSoftInference(req: SoftInferenceRequest): Promise<InferenceResponse> {
  return postJSON<InferenceResponse>('/api/v1/inference/soft', req);
}

export function runDecomposedInference(req: SoftInferenceRequest): Promise<DecomposedInferenceResponse> {
  return postJSON<DecomposedInferenceResponse>('/api/v1/inference/decompose', req);
}

export function runQuantum(req: QuantumRequest): Promise<QuantumResponse> {
  return postJSON<QuantumResponse>('/api/v1/quantum', req);
}

export function getRecordMetadata(): Promise<RecordMetadataResponse> {
  return getJSON<RecordMetadataResponse>('/api/v1/record_metadata');
}

export function analyseRecord(convictions: Conviction[]): Promise<RecordAnalysisResponse> {
  return postJSON<RecordAnalysisResponse>('/api/v1/record_analysis', { convictions });
}

export function getArchitecture(): Promise<ArchitectureResponse> {
  return getJSON<ArchitectureResponse>('/api/v1/architecture');
}

export function checkHealth(): Promise<HealthResponse> {
  return getJSON<HealthResponse>('/api/v1/health');
}