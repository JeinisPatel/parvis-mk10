'use client';

import { TopBar } from '@/components/TopBar';
import { useProfile, type CaseProfile } from '@/lib/hooks/useProfile';
import { PV } from '@/lib/tokens';
import { ItalicCaption } from '@/components/atoms/ItalicCaption';
import { Glyph, ICON } from '@/components/Glyph';
import { useState } from 'react';

/**
 * Case profile — the data spine for the whole audit.
 *
 * Captures identity, Gladue / Ipeelee demographic context, health & cognition
 * advisories (FASD, cognitive assessment, mental health diagnoses), the
 * offence(s), and the procedural posture of the s.753 application.
 *
 * State persists to browser localStorage. Phase A.5 swaps that for Supabase.
 *
 * Profile fields that *imply* doctrinal evidence (FASD → N9; Indigenous
 * identity → engages Gladue framework; cognitive assessment → N5/N6 risk
 * tool / IAC scrutiny) render an advisory chip below the field — they do
 * NOT auto-toggle the Risk & distortions evidence. That separation is
 * doctrinal: a profile fact is not yet an evidentiary claim.
 */

export default function ProfilePage() {
  const { profile, update, reset, hydrated } = useProfile();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!hydrated) {
    return (
      <>
        <TopBar breadcrumb="Case profile" showPosterior={false} />
        <div className="px-9 py-7 font-mono text-ink3" style={{ fontSize: 12 }}>
          hydrating profile…
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb="Case profile" />

      <div style={{ padding: '24px 36px 64px', maxWidth: 900 }}>
        {/* Page heading */}
        <div className="mb-6">
          <h1
            className="font-serif text-ink mb-1"
            style={{ fontSize: 26, fontWeight: 500 }}
          >
            Case profile
          </h1>
          <p
            className="font-serif italic text-ink2 leading-relaxed"
            style={{ fontSize: 14, maxWidth: 640 }}
          >
            Record the practitioner's understanding of the case at intake.
            Profile fields are <b className="not-italic font-semibold">record</b>,
            not <b className="not-italic font-semibold">evidence</b> — entries
            that imply specific doctrinal nodes surface as advisory chips, but
            the engine only registers what you toggle on the Risk & distortions
            screen.
          </p>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-4 mb-7">
          <span
            className="font-mono uppercase tracking-caps rounded-full"
            style={{
              fontSize: 10,
              padding: '4px 10px',
              background: PV.mitigationSoft,
              color: PV.mitigation,
            }}
          >
            ● saved locally
          </span>
          <span className="text-ink4 font-mono" style={{ fontSize: 11 }}>
            localStorage · {PROFILE_KEY_DISPLAY}
          </span>
          <span className="flex-1" />
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="font-mono uppercase tracking-caps rounded border hover:bg-paper3 transition-colors"
              style={{
                fontSize: 10,
                padding: '5px 10px',
                color: PV.ink3,
                borderColor: PV.border,
              }}
            >
              reset profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-ink3" style={{ fontSize: 10 }}>
                clear all profile data?
              </span>
              <button
                type="button"
                onClick={() => { reset(); setShowResetConfirm(false); }}
                className="font-mono uppercase tracking-caps rounded"
                style={{
                  fontSize: 10,
                  padding: '5px 10px',
                  background: PV.risk,
                  color: '#fff',
                }}
              >
                confirm
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="font-mono uppercase tracking-caps text-ink3"
                style={{ fontSize: 10, padding: '5px 10px' }}
              >
                cancel
              </button>
            </div>
          )}
        </div>

        {/* ── Identity ─────────────────────────────────────────────────── */}
        <Section
          color={PV.ink2}
          title="Identity"
          blurb="Used to compose the case header throughout the audit."
        >
          <Field label="Case reference" caption="Display name (e.g. R v Akwasi)">
            <Input value={profile.caseReference} onChange={(v) => update('caseReference', v)} />
          </Field>
          <Row>
            <Field label="Given name(s)">
              <Input value={profile.givenName} onChange={(v) => update('givenName', v)} />
            </Field>
            <Field label="Family name">
              <Input value={profile.familyName} onChange={(v) => update('familyName', v)} />
            </Field>
          </Row>
          <Row>
            <Field label="Date of birth">
              <Input
                value={profile.dateOfBirth}
                onChange={(v) => update('dateOfBirth', v)}
                type="date"
              />
            </Field>
            <Field label="Pronouns" caption="e.g. he/him, she/her, they/them">
              <Input value={profile.pronouns} onChange={(v) => update('pronouns', v)} />
            </Field>
          </Row>
        </Section>

        {/* ── Gladue / Ipeelee context ────────────────────────────────── */}
        <Section
          color={PV.dual}
          title="Demographic context (Gladue / Ipeelee)"
          blurb="Indigenous identity engages the Gladue framework as a structural lens."
        >
          <Field label="Indigenous identity">
            <Select
              value={profile.indigenousIdentity}
              onChange={(v) => update('indigenousIdentity', v as CaseProfile['indigenousIdentity'])}
              options={[
                { value: 'none',              label: 'Not Indigenous'   },
                { value: 'first_nations',     label: 'First Nations'    },
                { value: 'metis',             label: 'Métis'            },
                { value: 'inuit',             label: 'Inuit'            },
                { value: 'other_indigenous',  label: 'Other Indigenous' },
              ]}
            />
            {profile.indigenousIdentity !== 'none' && (
              <Chip color={PV.dual}>
                Engages the Gladue / Ipeelee framework. Consider N10 (Intergenerational trauma) and N12 (Gladue misapplication).
              </Chip>
            )}
          </Field>
          {profile.indigenousIdentity !== 'none' && (
            <Field label="Nation / community" caption="e.g. Mohawk (Tyendinaga), Cree (Mistawasis), Inuvialuit">
              <Input value={profile.nationCommunity} onChange={(v) => update('nationCommunity', v)} />
            </Field>
          )}
          <Row>
            <Field label="Place of origin" caption="Community / reserve / urban centre">
              <Input value={profile.placeOfOrigin} onChange={(v) => update('placeOfOrigin', v)} />
            </Field>
            <Field label="Current residence">
              <Input value={profile.currentResidence} onChange={(v) => update('currentResidence', v)} />
            </Field>
          </Row>
        </Section>

        {/* ── Health & cognition ──────────────────────────────────────── */}
        <Section
          color={PV.mitigation}
          title="Health & cognition"
          blurb="Mitigations and dual-factor considerations under Friesen, Boutilier, and the Gladue framework."
        >
          <Field label="Diagnoses / advisories">
            <Checkbox
              checked={profile.fasdDiagnosis}
              onChange={(v) => update('fasdDiagnosis', v)}
              label="FASD diagnosis on record"
            />
            {profile.fasdDiagnosis && (
              <Chip color={PV.dual}>
                Engages N9 (FASD) as a dual-factor node — vulnerability and risk
                under <i>R v Friesen</i> 2020 SCC 9.
              </Chip>
            )}
            <Checkbox
              checked={profile.cognitiveAssess}
              onChange={(v) => update('cognitiveAssess', v)}
              label="Formal cognitive / psychological assessment completed"
            />
            {profile.cognitiveAssess && (
              <Chip color={PV.distortion}>
                Cultural validity of the instrument may warrant N5 review under{' '}
                <i>Ewert v Canada</i> 2018 SCC 30.
              </Chip>
            )}
          </Field>
          <Field
            label="Mental health diagnoses (general)"
            caption="Brief description only — full clinical detail belongs in Documents."
          >
            <Textarea value={profile.mentalHealthDx} onChange={(v) => update('mentalHealthDx', v)} rows={3} />
          </Field>
        </Section>

        {/* ── Offence ─────────────────────────────────────────────────── */}
        <Section
          color={PV.risk}
          title="Offence(s)"
          blurb="Index offence and any additional charges before the court."
        >
          <Field label="Primary charge" caption="Section reference + short description">
            <Input value={profile.primaryCharge} onChange={(v) => update('primaryCharge', v)} />
          </Field>
          <Field label="Additional charges" caption="Comma-separated">
            <Textarea value={profile.additionalCharges} onChange={(v) => update('additionalCharges', v)} rows={2} />
          </Field>
          <Row>
            <Field label="s.753 application">
              <Select
                value={profile.s753Application}
                onChange={(v) => update('s753Application', v as CaseProfile['s753Application'])}
                options={[
                  { value: 'not_yet',       label: 'Not yet filed'  },
                  { value: 'contemplated',  label: 'Contemplated'   },
                  { value: 'filed',         label: 'Filed'          },
                ]}
              />
            </Field>
          </Row>
          <Field label="Crown sentencing position">
            <Textarea value={profile.crownPosition} onChange={(v) => update('crownPosition', v)} rows={2} />
          </Field>
          <Field label="Defence sentencing position">
            <Textarea value={profile.defencePosition} onChange={(v) => update('defencePosition', v)} rows={2} />
          </Field>
        </Section>

        {/* ── Court ───────────────────────────────────────────────────── */}
        <Section
          color={PV.constraint}
          title="Court & procedural posture"
          blurb="Jurisdiction, court, hearing, and counsel of record."
        >
          <Row>
            <Field label="Jurisdiction">
              <Input value={profile.jurisdiction} onChange={(v) => update('jurisdiction', v)} />
            </Field>
            <Field label="Court" caption="e.g. ONSC, BCCA, QCCS">
              <Input value={profile.court} onChange={(v) => update('court', v)} />
            </Field>
          </Row>
          <Field label="Courthouse" caption="Address or registry">
            <Input value={profile.courthouse} onChange={(v) => update('courthouse', v)} />
          </Field>
          <Row>
            <Field label="Presiding judge">
              <Input value={profile.presidingJudge} onChange={(v) => update('presidingJudge', v)} />
            </Field>
            <Field label="Hearing date">
              <Input
                value={profile.hearingDate}
                onChange={(v) => update('hearingDate', v)}
                type="date"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Defence counsel">
              <Input value={profile.defenceCounsel} onChange={(v) => update('defenceCounsel', v)} />
            </Field>
            <Field label="Crown counsel">
              <Input value={profile.crownCounsel} onChange={(v) => update('crownCounsel', v)} />
            </Field>
          </Row>
        </Section>
      </div>
    </>
  );
}

// ── Display constant (the localStorage key, exposed for the status strip) ───
const PROFILE_KEY_DISPLAY = 'parvis.mk9.profile';

// ── Layout primitives ────────────────────────────────────────────────────────

function Section({
  color, title, blurb, children,
}: {
  color: string; title: string; blurb: string; children: React.ReactNode;
}) {
  return (
    <section className="mb-9">
      <div
        className="grid items-baseline mb-4 pb-2 border-b"
        style={{ gridTemplateColumns: '8px 1fr', gap: 14, borderColor: PV.border }}
      >
        <div
          style={{
            width: 4, height: 22, borderRadius: 2, alignSelf: 'center', background: color,
          }}
        />
        <div>
          <div
            className="font-serif font-medium text-ink"
            style={{ fontSize: 17, letterSpacing: '-0.005em' }}
          >
            {title}
          </div>
          <div
            className="font-serif italic text-ink3 mt-0.5"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            {blurb}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}
    >
      {children}
    </div>
  );
}

function Field({
  label, caption, children,
}: {
  label: string; caption?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="font-mono uppercase tracking-caps text-ink3"
        style={{ fontSize: 10 }}
      >
        {label}
      </label>
      {caption && <ItalicCaption>{caption}</ItalicCaption>}
      <div>{children}</div>
    </div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div
      className="mt-2 rounded inline-flex items-start gap-2"
      style={{
        padding: '6px 10px',
        fontSize: 11.5,
        background: `${color}14`,
        color,
        border: `1px solid ${color}33`,
        lineHeight: 1.4,
      }}
    >
      <Glyph d={ICON.spark} size={11} color={color} />
      <span style={{ color: PV.ink2 }}>{children}</span>
    </div>
  );
}

// ── Form primitives ──────────────────────────────────────────────────────────

function Input({
  value, onChange, type = 'text',
}: {
  value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-paper text-ink rounded border focus:outline-none focus:ring-2 transition"
      style={{
        fontSize: 13.5,
        padding: '7px 10px',
        borderColor: PV.border,
        // @ts-expect-error — CSS custom property used by Tailwind's focus:ring
        '--tw-ring-color': PV.distortion + '55',
      }}
    />
  );
}

function Textarea({
  value, onChange, rows = 3,
}: {
  value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full bg-paper text-ink rounded border focus:outline-none focus:ring-2 transition resize-y"
      style={{
        fontSize: 13.5,
        padding: '7px 10px',
        borderColor: PV.border,
        // @ts-expect-error — CSS custom property used by Tailwind's focus:ring
        '--tw-ring-color': PV.distortion + '55',
        lineHeight: 1.5,
      }}
    />
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-paper text-ink rounded border focus:outline-none focus:ring-2 transition"
      style={{
        fontSize: 13.5,
        padding: '7px 10px',
        borderColor: PV.border,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function Checkbox({
  checked, onChange, label,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label
      className="flex items-center gap-2 cursor-pointer select-none py-1"
      style={{ fontSize: 13.5, color: PV.ink2 }}
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