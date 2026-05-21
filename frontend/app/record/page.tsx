'use client';

import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { PV } from '@/lib/tokens';
import { ItalicCaption } from '@/components/atoms/ItalicCaption';
import { Glyph, ICON } from '@/components/Glyph';
import { useRecord, applyRecordToEvidence } from '@/lib/hooks/useRecord';
import { useQuery } from '@tanstack/react-query';
import { getRecordMetadata, type Conviction, type RecordImplication } from '@/lib/api';

/**
 * Criminal record — per-conviction wizard with localStorage persistence,
 * live backend analysis, and an explicit 'apply to evidence' bridge.
 *
 * Each conviction is captured one at a time with structured fields:
 *   - charge (free text)
 *   - category (dropdown — drives doctrinal classification)
 *   - year, jurisdiction, sentence type, sentence length
 *   - reliability flags: bail denied, counsel inadequate, overpoliced
 *     jurisdiction, plea under pressure
 *
 * On every change, the backend re-runs analyseRecord() and returns:
 *   - Boutilier pattern (escalating / stable / de-escalating / desistance)
 *   - Aggregate seriousness stats
 *   - Per-node advisory chips with doctrinal anchors
 *
 * The 'Apply strong implications to evidence' button writes 'strong'-typed
 * implications into the Risk & distortions evidence state. Advisory
 * implications require the practitioner to engage them deliberately.
 */

export default function CriminalRecordPage() {
  const r = useRecord();
  const metadata = useQuery({
    queryKey: ['record-metadata'],
    queryFn:  getRecordMetadata,
    staleTime: 5 * 60_000,
  });

  const [confirmApply, setConfirmApply] = useState(false);

  if (!r.hydrated) {
    return (
      <>
        <TopBar breadcrumb="Criminal record" showPosterior={false} />
        <div className="px-9 py-7 font-mono text-ink3" style={{ fontSize: 12 }}>
          loading record…
        </div>
      </>
    );
  }

  const categories     = metadata.data?.categories     ?? {};
  const sentence_types = metadata.data?.sentence_types ?? [];
  const analysis = r.analysis;

  const strongImpls   = analysis?.implications.filter((i) => i.type === 'strong') ?? [];
  const advisoryImpls = analysis?.implications.filter((i) => i.type === 'advisory') ?? [];

  return (
    <>
      <TopBar breadcrumb="Criminal record" />

      <div style={{ padding: '24px 36px 80px', maxWidth: 1080 }}>
        {/* Heading */}
        <div className="mb-6">
          <h1
            className="font-serif text-ink mb-1"
            style={{ fontSize: 26, fontWeight: 500 }}
          >
            Criminal record
          </h1>
          <p
            className="font-serif italic text-ink2 leading-relaxed"
            style={{ fontSize: 14, maxWidth: 720 }}
          >
            Capture every prior conviction the court will consider, together
            with the procedural conditions under which each was entered. The
            engine reads the record as a <b className="not-italic font-semibold">pattern</b>{' '}
            — Boutilier trajectory, temporal distortion under Friesen, and
            reliability discount under the §5.1.20 multiplier — and surfaces
            doctrinal implications below. Strong implications can be applied
            to the Risk &amp; distortions evidence state with one click;
            advisory implications must be engaged deliberately.
          </p>
        </div>

        {/* Pattern banner + aggregate */}
        {analysis && r.convictions.length > 0 && (
          <PatternBanner
            pattern={analysis.pattern}
            note={analysis.pattern_note}
            aggregate={analysis.aggregate}
          />
        )}

        {/* Conviction list */}
        <section className="mb-7">
          <div className="flex items-baseline justify-between mb-3">
            <h2
              className="font-serif text-ink"
              style={{ fontSize: 19, fontWeight: 500 }}
            >
              Convictions ({r.convictions.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={r.addConviction}
                className="font-mono uppercase tracking-caps rounded transition-colors"
                style={{
                  fontSize: 10,
                  padding: '6px 12px',
                  background: PV.ink,
                  color: '#fff',
                }}
              >
                + add conviction
              </button>
              {r.convictions.length > 0 && (
                <button
                  type="button"
                  onClick={r.clearAll}
                  className="font-mono uppercase tracking-caps rounded border transition-colors hover:bg-paper3"
                  style={{
                    fontSize: 10,
                    padding: '6px 12px',
                    color: PV.ink3,
                    borderColor: PV.border,
                  }}
                >
                  clear all
                </button>
              )}
            </div>
          </div>

          {r.convictions.length === 0 && (
            <div
              className="rounded-xl border bg-paper2 p-6 text-center"
              style={{ borderColor: PV.border }}
            >
              <ItalicCaption>
                No convictions recorded yet. Click "Add conviction" to begin
                the per-entry wizard. The doctrinal analysis appears as soon
                as the first conviction is saved.
              </ItalicCaption>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {r.convictions.map((c, i) => (
              <ConvictionCard
                key={c.id}
                index={i + 1}
                conviction={c}
                categories={categories}
                sentence_types={sentence_types}
                onUpdate={(field, value) => r.updateConviction(c.id, field, value)}
                onRemove={() => r.removeConviction(c.id)}
              />
            ))}
          </div>
        </section>

        {/* Doctrinal implications */}
        {analysis && analysis.implications.length > 0 && (
          <section className="mb-7">
            <div className="mb-3">
              <h2
                className="font-serif text-ink mb-1"
                style={{ fontSize: 19, fontWeight: 500 }}
              >
                Doctrinal implications
              </h2>
              <ItalicCaption>
                Each implication is anchored in binding or strongly persuasive
                authority. <b className="not-italic font-semibold">Strong</b> chips
                are robust enough that one click pushes them to the evidence
                state. <b className="not-italic font-semibold">Advisory</b> chips
                require the practitioner to engage them on the Risk &amp;
                distortions screen.
              </ItalicCaption>
            </div>

            {strongImpls.length > 0 && (
              <>
                <div className="label-caps mb-2" style={{ color: PV.risk }}>
                  Strong ({strongImpls.length})
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {strongImpls.map((imp) => (
                    <ImplicationCard key={imp.node + imp.anchor} imp={imp} />
                  ))}
                </div>
              </>
            )}

            {advisoryImpls.length > 0 && (
              <>
                <div className="label-caps mb-2" style={{ color: PV.distortion }}>
                  Advisory ({advisoryImpls.length})
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {advisoryImpls.map((imp) => (
                    <ImplicationCard key={imp.node + imp.anchor} imp={imp} />
                  ))}
                </div>
              </>
            )}

            {/* Apply to evidence */}
            <div
              className="mt-5 pt-4 border-t flex items-baseline gap-4"
              style={{ borderColor: PV.border }}
            >
              {!confirmApply ? (
                <button
                  type="button"
                  onClick={() => setConfirmApply(true)}
                  disabled={strongImpls.length === 0}
                  className="font-mono uppercase tracking-caps rounded transition-colors"
                  style={{
                    fontSize: 10,
                    padding: '8px 14px',
                    background: strongImpls.length > 0 ? PV.distortion : PV.paper3,
                    color: strongImpls.length > 0 ? '#fff' : PV.ink4,
                    cursor: strongImpls.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  → apply {strongImpls.length} strong implication{strongImpls.length === 1 ? '' : 's'} to evidence
                </button>
              ) : (
                <>
                  <span className="font-mono text-ink3" style={{ fontSize: 11 }}>
                    will overlay {strongImpls.length} node(s) on Risk &amp; distortions:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      applyRecordToEvidence(strongImpls);
                      setConfirmApply(false);
                    }}
                    className="font-mono uppercase tracking-caps rounded"
                    style={{
                      fontSize: 10,
                      padding: '8px 14px',
                      background: PV.mitigation,
                      color: '#fff',
                    }}
                  >
                    confirm apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmApply(false)}
                    className="font-mono uppercase tracking-caps"
                    style={{ fontSize: 10, color: PV.ink3 }}
                  >
                    cancel
                  </button>
                </>
              )}
              <span className="flex-1" />
              <ItalicCaption size={11}>
                Advisory chips remain untouched — engage them on{' '}
                <a href="/risk" className="underline" style={{ color: PV.distortion }}>
                  Risk &amp; distortions
                </a>{' '}
                if the evidence supports them.
              </ItalicCaption>
            </div>
          </section>
        )}
      </div>
    </>
  );
}


function PatternBanner({
  pattern, note, aggregate,
}: {
  pattern: string;
  note:    string;
  aggregate: { count: number; violent_count: number; weight_mean: number; span_years: number | null };
}) {
  const band = patternBand(pattern);
  return (
    <div
      className="rounded-xl border p-5 mb-6"
      style={{
        borderColor: band.color + '44',
        background:  band.color + '0A',
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className="rounded-full"
          style={{ width: 8, height: 8, background: band.color }}
        />
        <span
          className="font-mono uppercase tracking-caps font-bold"
          style={{ fontSize: 11, color: band.color }}
        >
          Boutilier pattern · {band.label}
        </span>
        <span className="flex-1" />
        <span className="text-ink3 font-mono" style={{ fontSize: 11 }}>
          {aggregate.count} conv · {aggregate.violent_count} violent · mean seriousness {aggregate.weight_mean.toFixed(2)}
          {aggregate.span_years != null && ` · ${aggregate.span_years}-year span`}
        </span>
      </div>
      <p
        className="font-serif italic"
        style={{ fontSize: 13.5, color: PV.ink2, lineHeight: 1.5 }}
      >
        {note}
      </p>
    </div>
  );
}


function ConvictionCard({
  index, conviction, categories, sentence_types, onUpdate, onRemove,
}: {
  index: number;
  conviction: Conviction;
  categories: Record<string, string>;
  sentence_types: string[];
  onUpdate: <K extends keyof Conviction>(field: K, value: Conviction[K]) => void;
  onRemove: () => void;
}) {
  const [collapsed, setCollapsed] = useState(conviction.charge !== '');
  const c = conviction;
  const catLabel = categories[c.category] ?? c.category;
  const flagsCount = [
    c.bail_denied, c.counsel_inadequate, c.overpoliced_jurisdiction, c.plea_under_pressure,
  ].filter(Boolean).length;

  if (collapsed) {
    return (
      <div
        className="rounded-lg border bg-paper p-3 hover:shadow-sm transition-shadow"
        style={{ borderColor: PV.border }}
      >
        <div className="flex items-baseline gap-3">
          <span className="label-caps">#{index}</span>
          <span
            className="font-serif font-medium text-ink flex-1"
            style={{ fontSize: 14 }}
          >
            {c.charge || <i className="font-serif text-ink4">untitled</i>}
          </span>
          <span className="font-mono text-ink3" style={{ fontSize: 11 }}>
            {catLabel}
          </span>
          {c.year && (
            <span className="font-mono tabular-nums text-ink3" style={{ fontSize: 11 }}>
              {c.year}
            </span>
          )}
          {flagsCount > 0 && (
            <span
              className="font-mono rounded-full px-2 py-0.5"
              style={{
                fontSize: 10,
                background: PV.distortion + '22',
                color: PV.distortion,
                fontWeight: 600,
              }}
            >
              {flagsCount} flag{flagsCount === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="font-mono uppercase tracking-caps text-ink3 hover:text-ink"
            style={{ fontSize: 10 }}
          >
            edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-ink4 hover:text-risk transition-colors"
            title="Remove conviction"
          >
            <Glyph d={ICON.close} size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border bg-paper p-4"
      style={{ borderColor: PV.distortion + '44' }}
    >
      <div className="flex items-baseline justify-between mb-3">
        <span className="label-caps">Conviction #{index}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="font-mono uppercase tracking-caps text-ink3 hover:text-ink"
            style={{ fontSize: 10 }}
          >
            done
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-ink4 hover:text-risk transition-colors"
            title="Remove this conviction"
          >
            <Glyph d={ICON.close} size={12} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Field label="Charge" caption="Plain-language description of the offence">
          <Input value={c.charge} onChange={(v) => onUpdate('charge', v)} placeholder="e.g. Aggravated assault s.268" />
        </Field>

        <Row>
          <Field label="Offence category" caption="Drives doctrinal classification">
            <Select
              value={c.category}
              onChange={(v) => onUpdate('category', v)}
              options={Object.entries(categories).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Year">
            <Input
              type="number"
              value={c.year?.toString() ?? ''}
              onChange={(v) => onUpdate('year', v === '' ? null : parseInt(v, 10))}
              placeholder="YYYY"
            />
          </Field>
        </Row>

        <Row>
          <Field label="Jurisdiction" caption="Province, territory, or court">
            <Input value={c.jurisdiction} onChange={(v) => onUpdate('jurisdiction', v)} placeholder="e.g. Ontario, NWT" />
          </Field>
          <Field label="Sentence type">
            <Select
              value={c.sentence_type}
              onChange={(v) => onUpdate('sentence_type', v)}
              options={sentence_types.map((s) => ({
                value: s,
                label: s.replace(/_/g, ' '),
              }))}
            />
          </Field>
        </Row>

        <Field label="Sentence length (months)" caption="Leave blank for non-custodial">
          <Input
            type="number"
            value={c.sentence_length_months?.toString() ?? ''}
            onChange={(v) => onUpdate('sentence_length_months', v === '' ? null : parseInt(v, 10))}
            placeholder="e.g. 36"
          />
        </Field>

        <Field label="Reliability flags" caption="Tick all that applied at the time of this conviction">
          <div className="grid grid-cols-2 gap-1">
            <Checkbox checked={c.bail_denied}              onChange={(v) => onUpdate('bail_denied', v)}              label="Bail was denied (Antic)" />
            <Checkbox checked={c.counsel_inadequate}       onChange={(v) => onUpdate('counsel_inadequate', v)}       label="Counsel was inadequate (G.D.B.)" />
            <Checkbox checked={c.overpoliced_jurisdiction} onChange={(v) => onUpdate('overpoliced_jurisdiction', v)} label="Over-policed jurisdiction (Le)" />
            <Checkbox checked={c.plea_under_pressure}      onChange={(v) => onUpdate('plea_under_pressure', v)}      label="Plea entered under pressure" />
          </div>
        </Field>

        <Field label="Aggravating factors" caption="Assessed on the facts of this offence — current or historical">
          <div className="grid grid-cols-2 gap-1">
            <Checkbox checked={c.brutal} onChange={(v) => onUpdate('brutal', v)} label="Conduct was brutal (s.753(1)(a)(iii))" />
          </div>
        </Field>

        <Field label="Notes" caption="Optional — relevant context not captured above">
          <Textarea value={c.notes} onChange={(v) => onUpdate('notes', v)} rows={2} />
        </Field>
      </div>
    </div>
  );
}


function ImplicationCard({ imp }: { imp: RecordImplication }) {
  const isStrong = imp.type === 'strong';
  const color = isStrong ? PV.risk : PV.distortion;
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: color + '33',
        background: color + '08',
      }}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className="font-mono font-bold rounded px-1.5 py-0.5 text-white"
          style={{ fontSize: 10, background: color }}
        >
          N{imp.node}
        </span>
        <span className="font-serif font-medium text-ink" style={{ fontSize: 13.5 }}>
          {imp.node_name}
        </span>
        <span className="flex-1" />
        <span
          className="font-mono uppercase tracking-caps font-bold"
          style={{ fontSize: 9, color }}
        >
          {imp.type}
        </span>
      </div>
      <p className="text-ink2" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
        {imp.note}
      </p>
      <p className="font-serif italic text-ink3 mt-1.5" style={{ fontSize: 11.5 }}>
        Anchor: {imp.anchor}
      </p>
    </div>
  );
}


// ── Form primitives (shared shape with Profile page) ────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>;
}

function Field({ label, caption, children }: { label: string; caption?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono uppercase tracking-caps text-ink3" style={{ fontSize: 10 }}>
        {label}
      </label>
      {caption && <ItalicCaption size={11}>{caption}</ItalicCaption>}
      <div>{children}</div>
    </div>
  );
}

function Input({
  value, onChange, type = 'text', placeholder,
}: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-paper text-ink rounded border focus:outline-none focus:ring-2 transition"
      style={{
        fontSize: 13,
        padding: '6px 9px',
        borderColor: PV.border,
        // @ts-expect-error
        '--tw-ring-color': PV.distortion + '55',
      }}
    />
  );
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full bg-paper text-ink rounded border focus:outline-none focus:ring-2 transition resize-y"
      style={{
        fontSize: 13,
        padding: '6px 9px',
        borderColor: PV.border,
        // @ts-expect-error
        '--tw-ring-color': PV.distortion + '55',
        lineHeight: 1.5,
      }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-paper text-ink rounded border focus:outline-none focus:ring-2 transition"
      style={{
        fontSize: 13,
        padding: '6px 9px',
        borderColor: PV.border,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none py-1"
      style={{ fontSize: 12.5, color: PV.ink2 }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: PV.distortion, width: 14, height: 14 }}
      />
      {label}
    </label>
  );
}


// ── Pattern band helper ─────────────────────────────────────────────────────

function patternBand(pattern: string): { label: string; color: string } {
  switch (pattern) {
    case 'escalating':    return { label: 'Escalating',    color: PV.risk        };
    case 'stable':        return { label: 'Stable',        color: PV.constraint  };
    case 'de_escalating': return { label: 'De-escalating', color: PV.mitigation  };
    case 'desistance':    return { label: 'Desistance',    color: PV.mitigation  };
    default:              return { label: 'Insufficient',  color: PV.ink3        };
  }
}