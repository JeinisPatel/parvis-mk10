/**
 * API client for document upload, listing, and analysis.
 *
 * All requests route through Next.js's /api/* proxy to the FastAPI backend
 * on port 8000. The analyze endpoint sends the localStorage API key as
 * an HTTP header; the backend uses it once per request and never persists
 * it server-side.
 */

import { readApiKeySync, type Provider } from '@/lib/hooks/useApiKey';
import { API_BASE } from '@/lib/api';
import { sessionHeaders } from '@/lib/sessionId';

const BASE = `${API_BASE}/api/v1/documents`;


export interface UploadedDocument {
  file_id:            string;
  filename:           string;
  size_bytes:         number;
  inferred_doc_type:  string;
  extracted_text:     string;
  text_was_truncated: boolean;
  uploaded_at:        string;
  case_reference:     string;
}

export interface DocumentRecord {
  file_id:            string;
  filename:           string;
  size_bytes:         number;
  inferred_doc_type:  string;
  uploaded_at:        string;
}

export interface NodeImplication {
  node_id:     string;
  delta:       number;
  confidence:  number;
  direction:   string;
  reasoning:   string;
  citations:   string[];
}

export interface StareDecisisBlock {
  document_jurisdiction: string | null;
  document_court_level:  string | null;
  jurisdiction_source:   string;
  inter_provincial_splits: any[];
  auto_detection:        any | null;
}

export interface JurisdictionInference {
  province:      string | null;
  court_level:   string | null;
  confidence:    string;
  province_hits: Record<string, number>;
  level_hits:    Record<string, number>;
  rationale:     string;
}

export interface AnalysisResult {
  file_id:               string;
  case_reference:        string;
  inferred_doc_type:     string;
  analyzer_status:       'completed' | 'no_key' | 'failed';
  error:                 string | null;
  provider:              string | null;
  document_summary:      string | null;
  applicable_framework:  string | null;
  connection_assessment: string | null;
  doctrinal_flags:       string[];
  ewert_concern:         boolean;
  nodes:                 NodeImplication[];
  stare_decisis:         StareDecisisBlock | null;
  jurisdiction_inference: JurisdictionInference | null;
}


export async function uploadDocument(
  caseReference: string,
  file: File,
): Promise<UploadedDocument> {
  const form = new FormData();
  form.append('case_reference', caseReference);
  form.append('file', file);

  const res = await fetch(`${BASE}/upload`, {
    method:  'POST',
    headers: sessionHeaders(),
    body:    form,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Upload failed: ${res.status} ${detail}`);
  }
  return res.json();
}


export async function listDocuments(
  caseReference: string,
): Promise<DocumentRecord[]> {
  const qs = new URLSearchParams({ case_reference: caseReference });
  const res = await fetch(`${BASE}/list?${qs.toString()}`, { headers: sessionHeaders() });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  return data.documents || [];
}


export async function deleteDocument(
  caseReference: string,
  fileId: string,
): Promise<void> {
  const qs = new URLSearchParams({ case_reference: caseReference });
  const res = await fetch(`${BASE}/${fileId}?${qs.toString()}`, {
    method:  'DELETE',
    headers: sessionHeaders(),
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}


export async function analyzeDocument(
  caseReference: string,
  fileId: string,
): Promise<AnalysisResult> {
  const keyData = readApiKeySync();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...sessionHeaders(),
  };
  if (keyData) {
    headers['X-Parvis-Api-Key']      = keyData.key;
    headers['X-Parvis-Api-Provider'] = keyData.provider;
  }

  const res = await fetch(`${BASE}/analyze`, {
    method:  'POST',
    headers,
    body:    JSON.stringify({ case_reference: caseReference, file_id: fileId }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Analyze failed: ${res.status} ${detail}`);
  }
  return res.json();
}
