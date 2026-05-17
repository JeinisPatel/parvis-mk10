'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { PV } from '@/lib/tokens';
import { useDocuments } from '@/lib/hooks/useDocuments';
import { useApiKey } from '@/lib/hooks/useApiKey';
import type { AnalysisResult, NodeImplication } from '@/lib/api/documents';


export default function DocumentsPage() {
  const d = useDocuments();
  const k = useApiKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await d.upload(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function toggle(fileId: string) {
    setExpanded((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
  }

  return (
    <div>
      <TopBar breadcrumb="Documents" showPosterior={true} />

      <div style={{ padding: '24px 36px 64px', maxWidth: 980 }}>

        <h1 style={{ fontSize: 26, fontWeight: 500, color: PV.ink, marginBottom: 4 }}>
          Documents
        </h1>
        <p style={{
          fontSize: 14, color: PV.ink2, fontStyle: 'italic',
          maxWidth: 720, lineHeight: 1.6, marginBottom: 24,
        }}>
          Upload Gladue reports, pre-sentence reports, expert assessments,
          and prior decisions. Text extraction and document-type inference
          run on upload. The Tetrad-grounded analysis layer is gated behind
          an LLM API key configured in Settings; without one, jurisdiction
          inference still surfaces (regex-based, no LLM call).
        </p>

        {/* Upload zone */}
        <div
          style={{
            border: '1.5px dashed ' + PV.border,
            background: PV.paper2,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            style={{ display: 'none' }}
            onChange={onFileChosen}
          />
          <div style={{ fontSize: 13, color: PV.ink3, marginBottom: 10 }}>
            Drag files here, or
          </div>
          <button
            type="button"
            onClick={pickFile}
            disabled={d.uploadInProgress}
            style={{
              fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '9px 20px',
              background: d.uploadInProgress ? PV.paper3 : PV.ink,
              color: d.uploadInProgress ? PV.ink4 : '#fff',
              border: 'none', borderRadius: 4,
              cursor: d.uploadInProgress ? 'wait' : 'pointer',
            }}
          >
            {d.uploadInProgress ? 'uploading...' : '+ select file'}
          </button>
          <div style={{ fontSize: 11, color: PV.ink4, marginTop: 8 }}>
            PDF, DOCX, TXT. Max 20 MB. Files persist to the case bucket.
          </div>
          {d.error ? (
            <div style={{
              fontSize: 11, color: PV.risk, marginTop: 10,
              fontFamily: 'monospace',
            }}>
              {d.error}
            </div>
          ) : null}
        </div>

        {/* Key-status banner */}
        {!k.hydrated ? null : !k.hasKey ? (
          <div style={{
            border: '1px solid ' + PV.constraint + '55',
            background: PV.constraint + '10',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 12,
            color: PV.ink2,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              fontWeight: 700, color: PV.constraint,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              fontSize: 10,
            }}>
              No API key
            </span>
            <span style={{ flex: 1 }}>
              Upload and text extraction work. Tetrad-grounded analysis is unavailable.
            </span>
            <Link
              href="/settings"
              style={{
                fontSize: 11, fontWeight: 600,
                color: PV.distortion,
                textDecoration: 'underline',
              }}
            >
              Configure key →
            </Link>
          </div>
        ) : null}

        {/* Document list */}
        <div style={{
          fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: PV.ink3, marginBottom: 12,
        }}>
          {d.loading ? 'loading...' : `Documents (${d.docs.length}) · case: ${d.caseRef}`}
        </div>

        {d.docs.length === 0 && !d.loading ? (
          <div style={{
            border: '1px solid ' + PV.border,
            borderRadius: 8,
            padding: 24,
            textAlign: 'center',
            fontSize: 13, color: PV.ink3, fontStyle: 'italic',
          }}>
            No documents uploaded for this case yet.
          </div>
        ) : null}

        {d.docs.map((doc) => {
          const analysis = d.analyses[doc.file_id];
          const isPending = !!d.pendingAnalysis[doc.file_id];
          const isExpanded = !!expanded[doc.file_id];

          return (
            <div
              key={doc.file_id}
              style={{
                border: '1px solid ' + PV.border,
                background: PV.paper,
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: PV.distortion,
                  background: PV.distortion + '15',
                  padding: '2px 8px', borderRadius: 999,
                }}>
                  {doc.inferred_doc_type}
                </span>
                <span style={{ fontSize: 14, color: PV.ink, fontWeight: 500, flex: 1 }}>
                  {doc.filename}
                </span>
                <span style={{ fontSize: 11, color: PV.ink4 }}>
                  {(doc.size_bytes / 1024).toFixed(1)} KB
                </span>
                <span style={{ fontSize: 11, color: PV.ink4 }}>
                  {new Date(doc.uploaded_at).toLocaleString()}
                </span>
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                {!analysis && !isPending ? (
                  <button
                    type="button"
                    onClick={() => d.analyze(doc.file_id)}
                    style={{
                      fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '7px 14px',
                      background: PV.distortion,
                      color: '#fff',
                      border: 'none', borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    analyse
                  </button>
                ) : null}
                {isPending ? (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '7px 14px',
                    background: PV.constraint + '22',
                    color: PV.constraint,
                    borderRadius: 4,
                  }}>
                    analysing...
                  </span>
                ) : null}
                {analysis ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggle(doc.file_id)}
                      style={{
                        fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '7px 14px',
                        background: 'transparent',
                        border: '1px solid ' + PV.border,
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: PV.ink2,
                      }}
                    >
                      {isExpanded ? 'collapse' : 'expand'}
                    </button>
                    <button
                      type="button"
                      onClick={() => d.analyze(doc.file_id)}
                      style={{
                        fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '7px 14px',
                        background: 'transparent',
                        border: '1px solid ' + PV.border,
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: PV.ink3,
                      }}
                    >
                      re-run
                    </button>
                  </>
                ) : null}
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => d.remove(doc.file_id)}
                  style={{
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '7px 14px',
                    background: 'transparent',
                    border: '1px solid ' + PV.risk + '55',
                    color: PV.risk,
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  delete
                </button>
              </div>

              {/* Analysis result block */}
              {analysis && isExpanded ? (
                <AnalysisDisplay analysis={analysis} />
              ) : null}
            </div>
          );
        })}

      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────────────── */
/* Analysis result rendering                                              */
/* ─────────────────────────────────────────────────────────────────────── */

function AnalysisDisplay(props: { analysis: AnalysisResult }) {
  const a = props.analysis;

  if (a.analyzer_status === 'no_key') {
    return (
      <div style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: '1px solid ' + PV.border,
        fontSize: 13, color: PV.ink3, fontStyle: 'italic',
      }}>
        Document analysed without LLM (no key configured). Jurisdiction
        inference and document-type detection are available; node implications
        require an LLM call.
        {a.jurisdiction_inference ? (
          <div style={{ marginTop: 8 }}>
            <JurisdictionStrip ji={a.jurisdiction_inference} />
          </div>
        ) : null}
      </div>
    );
  }

  if (a.analyzer_status === 'failed') {
    return (
      <div style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: '1px solid ' + PV.border,
        fontSize: 13, color: PV.risk,
        fontFamily: 'monospace',
      }}>
        Analysis failed: {a.error || 'unknown error'}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + PV.border }}>
      {a.document_summary ? (
        <div style={{
          fontSize: 14, color: PV.ink2, fontStyle: 'italic',
          lineHeight: 1.6, marginBottom: 12,
        }}>
          {a.document_summary}
        </div>
      ) : null}

      {a.jurisdiction_inference ? (
        <div style={{ marginBottom: 14 }}>
          <JurisdictionStrip ji={a.jurisdiction_inference} />
        </div>
      ) : null}

      {a.nodes.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: PV.ink3, marginBottom: 8,
          }}>
            Node implications ({a.nodes.length})
          </div>
          {a.nodes.map((n) => <NodeRow key={n.node_id} node={n} />)}
        </div>
      ) : null}

      {a.doctrinal_flags.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: PV.ink3, marginBottom: 6,
          }}>
            Doctrinal flags
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {a.doctrinal_flags.map((f, i) => (
              <span key={i} style={{
                fontSize: 11,
                padding: '3px 8px',
                background: PV.constraint + '15',
                color: PV.constraint,
                borderRadius: 4,
                fontStyle: 'italic',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ fontSize: 10, color: PV.ink4, marginTop: 10, fontFamily: 'monospace' }}>
        Provider: {a.provider} · Framework: {a.applicable_framework || 'unknown'}
        {a.connection_assessment ? ` · Connection: ${a.connection_assessment}` : ''}
      </div>
    </div>
  );
}


function JurisdictionStrip(props: { ji: NonNullable<AnalysisResult['jurisdiction_inference']> }) {
  const j = props.ji;
  const confColor =
    j.confidence === 'high'   ? PV.mitigation :
    j.confidence === 'medium' ? PV.constraint :
    j.confidence === 'low'    ? PV.distortion :
                                PV.ink4;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: PV.ink3,
      }}>
        Jurisdiction
      </span>
      <span style={{ fontSize: 12, color: PV.ink2, fontWeight: 500 }}>
        {j.province ? j.province.toUpperCase() : '—'}
        {j.court_level ? ' · ' + j.court_level.toUpperCase() : ''}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        padding: '2px 6px', borderRadius: 999,
        background: confColor + '22', color: confColor,
      }}>
        {j.confidence} confidence
      </span>
      <span style={{
        fontSize: 11, color: PV.ink3, fontStyle: 'italic',
      }}>
        {j.rationale}
      </span>
    </div>
  );
}


function NodeRow(props: { node: NodeImplication }) {
  const n = props.node;
  const isRiskUp = n.delta > 0;
  const color = isRiskUp ? PV.risk : PV.mitigation;
  const arrow = isRiskUp ? '↑' : '↓';
  const strong = Math.abs(n.delta) * n.confidence >= 0.15;

  return (
    <div style={{
      padding: '10px 12px',
      borderLeft: '3px solid ' + color,
      background: PV.paper2,
      borderRadius: 4,
      marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4,
          background: color + '15', color: color,
        }}>
          N{n.node_id}
        </span>
        <span style={{ fontSize: 13, color: color, fontWeight: 700 }}>
          {arrow} {(Math.abs(n.delta) * 100).toFixed(0)}%
        </span>
        <span style={{ fontSize: 11, color: PV.ink3 }}>
          conf {(n.confidence * 100).toFixed(0)}%
        </span>
        {strong ? (
          <span style={{
            fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '1px 6px', borderRadius: 999,
            background: PV.ink + '15', color: PV.ink,
          }}>
            strong
          </span>
        ) : null}
      </div>
      {n.reasoning ? (
        <div style={{ fontSize: 12, color: PV.ink2, lineHeight: 1.5, marginBottom: 4 }}>
          {n.reasoning}
        </div>
      ) : null}
      {n.citations.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {n.citations.map((c, i) => (
            <span key={i} style={{
              fontSize: 10, fontStyle: 'italic',
              padding: '1px 6px',
              background: PV.paper3,
              color: PV.ink3,
              borderRadius: 3,
            }}>
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
