'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '../../lib/hooks/useProfile';
import { useEvidence } from '../../lib/hooks/useEvidence';
import { API_BASE } from '../../lib/api';
import { sessionHeaders } from '../../lib/sessionId';

type SectionDef = { id: string; label: string; desc: string };

const ALL_SECTIONS: SectionDef[] = [
  { id: 'title', label: 'Title page', desc: 'Case reference, jurisdiction, date generated' },
  { id: 'executive_summary', label: 'Executive summary', desc: 'DO posterior probability and headline framing' },
  { id: 'profile', label: 'Case profile', desc: 'All captured profile fields, structured as a table' },
  { id: 'documents', label: 'Documents reviewed', desc: 'List of uploaded documents with summaries' },
  { id: 'intake', label: 'Intake interview', desc: 'Structured state extracted from the intake conversation' },
  { id: 'risk', label: 'Risk state', desc: 'Current soft-evidence values per node' },
  { id: 'gladue', label: 'Gladue submission', desc: 'Selected factors and generated narrative' },
  { id: 'sce', label: 'Social context evidence', desc: 'Morris/Anderson/Ellis factors and narrative' },
  { id: 'authorities', label: 'Cited authorities', desc: 'Deduplicated list of cases cited in the submissions' },
];


function slugify(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '') || 'case';
}


function safeReadJSON(key: string): any {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}


export default function AuditPage() {
  const { profile, hydrated: profileHydrated } = useProfile();
  const { evidence, inference } = useEvidence();

  const [format, setFormat] = useState<'docx' | 'pdf'>('docx');
  const [enabledSections, setEnabledSections] = useState<Set<string>>(
    new Set(ALL_SECTIONS.map(s => s.id))
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const [gladueState, setGladueState] = useState<any>(null);
  const [sceState, setSceState] = useState<any>(null);
  const [chatState, setChatState] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  const caseSlug = useMemo(() => {
    if (!profile) return null;
    return slugify(
      profile.caseReference ||
      profile.familyName ||
      profile.givenName ||
      ''
    );
  }, [profile]);

  useEffect(() => {
    if (!profileHydrated || !caseSlug) return;
    setGladueState(safeReadJSON(`parvis.mk9.gladue.${caseSlug}`));
    setSceState(safeReadJSON(`parvis.mk9.sce.${caseSlug}`));
    setChatState(safeReadJSON(`parvis.mk9.chat.${caseSlug}`));
  }, [profileHydrated, caseSlug]);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/documents/list`, { headers: sessionHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (Array.isArray(data.documents)) setDocuments(data.documents);
        else if (Array.isArray(data.files)) setDocuments(data.files);
        else if (Array.isArray(data)) setDocuments(data);
      })
      .catch(() => {});
  }, []);

  const stateSummary = useMemo(() => {
    const profileFieldsSet = profile
      ? Object.values(profile).filter(v => v !== null && v !== '' && v !== undefined).length
      : 0;
    const evidenceCount = evidence ? Object.keys(evidence).length : 0;

    const gladueFactors =
      gladueState?.selectedFactors?.length ??
      gladueState?.selected_factors?.length ??
      gladueState?.factors?.length ?? 0;
    const gladueHasNarrative = Boolean(
      gladueState?.narrative || gladueState?.narrativeText
    );

    const sceFactors =
      sceState?.selectedFactors?.length ??
      sceState?.selected_factors?.length ??
      sceState?.factors?.length ?? 0;
    const sceHasNarrative = Boolean(
      sceState?.narrative || sceState?.narrativeText
    );

    const chatExtracted =
      chatState?.extracted || chatState?.extractedState || chatState?.state;
    const chatComplete = Boolean(
      chatExtracted && typeof chatExtracted === 'object' && Object.keys(chatExtracted).length > 0
    );

    const posterior =
      (inference as any)?.do_posterior ??
      (inference as any)?.doRisk ??
      (inference as any)?.posterior ??
      null;

    return {
      profileFieldsSet,
      evidenceCount,
      gladueFactors,
      gladueHasNarrative,
      sceFactors,
      sceHasNarrative,
      chatComplete,
      documentsCount: documents.length,
      posterior,
    };
  }, [profile, evidence, gladueState, sceState, chatState, documents, inference]);

  function toggleSection(id: string) {
    setEnabledSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setEnabledSections(new Set(ALL_SECTIONS.map(s => s.id)));
  }

  function clearAll() {
    setEnabledSections(new Set());
  }

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    setLastGenerated(null);

    try {
      const normalizedGladue = gladueState ? {
        selected_factors:
          gladueState.selectedFactors ||
          gladueState.selected_factors ||
          gladueState.factors || [],
        narrative:
          gladueState.narrative ||
          gladueState.narrativeText || '',
      } : null;

      const normalizedSCE = sceState ? {
        selected_factors:
          sceState.selectedFactors ||
          sceState.selected_factors ||
          sceState.factors || [],
        narrative:
          sceState.narrative ||
          sceState.narrativeText || '',
      } : null;

      const intakeExtracted = chatState ? {
        fields:
          chatState.extracted ||
          chatState.extractedState ||
          chatState.state || {},
        summary: chatState.summary || chatState.note || '',
      } : null;

      const inferenceForReport = inference ? {
        do_posterior:
          (inference as any).do_posterior ??
          (inference as any).doRisk ??
          (inference as any).posterior ??
          null,
        drivers_up:
          (inference as any).drivers_up ||
          (inference as any).driversUp || [],
        drivers_down:
          (inference as any).drivers_down ||
          (inference as any).driversDown || [],
      } : null;

      const documentsForReport = documents.map((d: any) => ({
        filename: d.filename || d.name || d.original_filename || 'Untitled',
        summary: d.summary || d.analysis_summary || d.analysis || '',
      }));

      const body = {
        format,
        sections: Array.from(enabledSections),
        case_reference: profile?.caseReference || null,
        profile: profile || {},
        documents: documentsForReport,
        intake_extracted: intakeExtracted,
        evidence: evidence || {},
        inference: inferenceForReport,
        gladue: normalizedGladue,
        sce: normalizedSCE,
        node_labels: {},
      };

      const response = await fetch(`${API_BASE}/api/v1/audit/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) detail = errBody.detail;
        } catch {
          const errText = await response.text();
          if (errText) detail = errText.slice(0, 300);
        }
        throw new Error(detail);
      }

      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `parvis-audit.${format}`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastGenerated(filename);
    } catch (e: any) {
      setError(e?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  if (!profileHydrated) {
    return (
      <main className="min-h-screen p-8 bg-stone-50 text-stone-700">
        <p className="font-serif italic">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12">
          <Link href="/overview" className="text-sm text-stone-500 hover:text-stone-700">
            Overview
          </Link>
          <h1 className="mt-3 font-serif text-4xl text-stone-900">Audit report</h1>
          <p className="mt-3 text-stone-600 italic font-serif leading-relaxed">
            Composes a doctrinally literate audit of the current case state, suitable for filing as a companion document to the substantive submissions of counsel. The report does not predict; it surfaces the structure of the inference.
          </p>
        </header>

        <section className="mb-10 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="font-serif text-xl mb-5">Current state</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <StateRow
              label="Case profile"
              value={`${stateSummary.profileFieldsSet} field${stateSummary.profileFieldsSet === 1 ? '' : 's'} captured`}
              empty={stateSummary.profileFieldsSet === 0}
            />
            <StateRow
              label="Risk state"
              value={`${stateSummary.evidenceCount} node${stateSummary.evidenceCount === 1 ? '' : 's'} set`}
              empty={stateSummary.evidenceCount === 0}
            />
            <StateRow
              label="Documents reviewed"
              value={`${stateSummary.documentsCount} document${stateSummary.documentsCount === 1 ? '' : 's'}`}
              empty={stateSummary.documentsCount === 0}
            />
            <StateRow
              label="Intake interview"
              value={stateSummary.chatComplete ? 'Extracted state captured' : 'Not started'}
              empty={!stateSummary.chatComplete}
            />
            <StateRow
              label="Gladue submission"
              value={
                stateSummary.gladueFactors > 0
                  ? `${stateSummary.gladueFactors} factor${stateSummary.gladueFactors === 1 ? '' : 's'}${stateSummary.gladueHasNarrative ? ', narrative ready' : ''}`
                  : 'Not started'
              }
              empty={stateSummary.gladueFactors === 0}
            />
            <StateRow
              label="SCE submission"
              value={
                stateSummary.sceFactors > 0
                  ? `${stateSummary.sceFactors} factor${stateSummary.sceFactors === 1 ? '' : 's'}${stateSummary.sceHasNarrative ? ', narrative ready' : ''}`
                  : 'Not started'
              }
              empty={stateSummary.sceFactors === 0}
            />
          </div>

          {stateSummary.posterior !== null && stateSummary.posterior !== undefined && (
            <div className="mt-6 pt-5 border-t border-stone-200">
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
                Current DO posterior
              </div>
              <div className="flex items-baseline gap-3">
                <div className="font-serif text-3xl text-stone-900">
                  {(stateSummary.posterior * 100).toFixed(1)}%
                </div>
                <div className="text-sm italic text-stone-500">
                  {stateSummary.posterior * 100 >= 87
                    ? 'above BRD threshold — designation territory'
                    : 'below BRD threshold'}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="font-serif text-lg mb-3">Format</h2>
          <div className="flex gap-3">
            <FormatButton
              active={format === 'docx'}
              onClick={() => setFormat('docx')}
              label="DOCX"
              desc="Editable Word document"
            />
            <FormatButton
              active={format === 'pdf'}
              onClick={() => setFormat('pdf')}
              label="PDF"
              desc="Print-ready"
            />
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg">Sections to include</h2>
            <div className="flex gap-4 text-xs">
              <button onClick={selectAll} className="text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline">
                Select all
              </button>
              <button onClick={clearAll} className="text-stone-600 hover:text-stone-900 underline-offset-2 hover:underline">
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {ALL_SECTIONS.map(s => (
              <SectionToggle
                key={s.id}
                label={s.label}
                desc={s.desc}
                checked={enabledSections.has(s.id)}
                onChange={() => toggleSection(s.id)}
              />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <button
            onClick={handleGenerate}
            disabled={generating || enabledSections.size === 0}
            className="w-full py-4 bg-stone-900 text-white font-serif text-lg rounded-lg
                       hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed
                       transition-colors"
          >
            {generating
              ? 'Generating...'
              : `Generate ${format.toUpperCase()} audit (${enabledSections.size} section${enabledSections.size === 1 ? '' : 's'})`}
          </button>

          {enabledSections.size === 0 && (
            <p className="mt-3 text-sm text-amber-700 text-center font-serif italic">
              Select at least one section to generate a report.
            </p>
          )}

          {error && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-sm">
              <strong className="font-serif">Generation failed:</strong> {error}
            </div>
          )}

          {lastGenerated && !error && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-sm">
              <strong className="font-serif">Downloaded:</strong> {lastGenerated}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


function StateRow({ label, value, empty }: { label: string; value: string; empty?: boolean }) {
  return (
    <div className={empty ? 'opacity-50' : ''}>
      <div className="text-xs uppercase tracking-wider text-stone-500 mb-0.5">{label}</div>
      <div className="text-stone-900 font-serif">{value}</div>
    </div>
  );
}


function FormatButton({ active, onClick, label, desc }: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-4 rounded-lg border-2 transition-colors text-left
                  ${active
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-900 hover:border-stone-400'}`}
    >
      <div className="font-serif text-lg font-bold">{label}</div>
      <div className={`text-xs mt-0.5 ${active ? 'text-stone-300' : 'text-stone-500'}`}>{desc}</div>
    </button>
  );
}


function SectionToggle({ label, desc, checked, onChange }: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 bg-white
                      hover:border-stone-300 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-stone-900 cursor-pointer"
      />
      <div className="flex-1">
        <div className="font-serif text-stone-900">{label}</div>
        <div className="text-sm text-stone-500 mt-0.5">{desc}</div>
      </div>
    </label>
  );
}
