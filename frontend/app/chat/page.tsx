'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { PV } from '@/lib/tokens';
import { useApiKey } from '@/lib/hooks/useApiKey';
import { useProfile } from '@/lib/hooks/useProfile';
import { useIntakeChat, type IntakeSuggestion, type IntakeMessage } from '@/lib/hooks/useIntakeChat';

/**
 * Intake (chat) — PARVIS-led structured interview.
 *
 * Three panes:
 *   Top:    Phase progress strip (six pills + overall % bar)
 *   Left:   Chat scrollback + composer (~60% width)
 *   Right:  Suggestion sidebar (~40% width) — pending/applied/dismissed
 *
 * The chat thread accumulates messages; suggestions appear in the sidebar
 * keyed to their source turn. Apply writes the suggested field into the
 * relevant case-state hook (currently useProfile; future: useRecord, etc.).
 */

const PHASE_ORDER = [
  { key: 'identity',             label: 'Identity' },
  { key: 'indigenous_gladue',    label: 'Gladue' },
  { key: 'criminal_history',     label: 'Record' },
  { key: 'psychological_risk',   label: 'Risk' },
  { key: 'procedural_integrity', label: 'Procedure' },
  { key: 'systemic_context',     label: 'Systemic' },
];


type CaseProfileIndigenous = 'none' | 'first_nations' | 'metis' | 'inuit' | 'other_indigenous';

export default function ChatPage() {
  const k = useApiKey();
  const profile = useProfile();
  const c = useIntakeChat();
  const [composerText, setComposerText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Auto-scroll on new message, unless the user has scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [c.messages.length, c.pending]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = dist < 40;
  }

  async function handleSend() {
    if (!composerText.trim() || c.pending) return;
    const text = composerText;
    setComposerText('');
    stickToBottom.current = true;
    await c.send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleApply(s: IntakeSuggestion) {
    if (!profile || typeof profile.update !== 'function') {
      c.applySuggestion(s.id);
      return;
    }
    const update = profile.update as (field: any, value: any) => void;
    const current = (profile as any).profile || {};
    const value = s.value;

    // Normalise the LLM's field key into a canonical one. Claude tends to
    // emit reasonable variations (client_name vs name, charge_section vs
    // offence_section). We accept all common aliases so the dispatcher
    // doesn't silently drop applies.
    const canonical = canonicaliseField(s.field);

    switch (canonical) {
      case 'name': {
        const parts = String(value).trim().split(/\s+/);
        if (parts.length === 1) {
          update('givenName', parts[0]);
        } else {
          update('familyName', parts[parts.length - 1]);
          update('givenName', parts.slice(0, -1).join(' '));
        }
        break;
      }
      case 'given_name':
        update('givenName', String(value));
        break;
      case 'family_name':
        update('familyName', String(value));
        break;
      case 'jurisdiction':
        update('jurisdiction', String(value));
        break;
      case 'court':
        update('court', String(value));
        break;
      case 'proposed_offence': {
        const existing = current.primaryCharge || '';
        const newVal = String(value);
        // If a section reference is already in primaryCharge, append the
        // description after a separator. Otherwise just set it.
        if (existing && !existing.toLowerCase().includes(newVal.toLowerCase())) {
          update('primaryCharge', newVal + ' (' + existing + ')');
        } else {
          update('primaryCharge', newVal);
        }
        break;
      }
      case 'offence_section': {
        const existing = current.primaryCharge || '';
        const section = String(value);
        if (!existing.toLowerCase().includes(section.toLowerCase())) {
          update('primaryCharge', existing ? existing + ' ' + section : section);
        }
        break;
      }
      case 'nation':
      case 'community': {
        const existing = current.nationCommunity || '';
        const newVal = String(value);
        if (existing.toLowerCase().includes(newVal.toLowerCase())) break;
        update('nationCommunity', existing ? existing + ', ' + newVal : newVal);
        break;
      }
      case 'indigenous_identity': {
        const raw = value;
        const v = String(raw).toLowerCase();
        let mapped: CaseProfileIndigenous = 'none';
        if (raw === true || v === 'true' ||
            v.includes('first nation') || v.includes('anishinaabe') ||
            v.includes('cree') || v.includes('mohawk') ||
            v.includes('ojibway') || v.includes('haudenosaunee') ||
            v.includes('algonquin') || v.includes('innu') ||
            v.includes('mi\'kmaq') || v.includes('mikmaq') ||
            v.includes('blackfoot') || v.includes('dene')) {
          mapped = 'first_nations';
        } else if (v.includes('metis') || v.includes('\u00e9tis')) {
          mapped = 'metis';
        } else if (v.includes('inuit') || v.includes('inuk')) {
          mapped = 'inuit';
        } else if (v.includes('indigenous') || v.includes('aboriginal') ||
                   v.includes('native')) {
          mapped = 'other_indigenous';
        }
        update('indigenousIdentity', mapped);
        if (mapped !== 'none' && typeof raw === 'string' && raw.trim() && !current.nationCommunity) {
          update('nationCommunity', String(raw));
        }
        break;
      }
      default:
        // Field has no Profile target — extracted state still tracks it
        // for downstream screens (Risk, SCE, Criminal record).
        break;
    }
    c.applySuggestion(s.id);
  }

  function canonicaliseField(key: string): string {
    const k = (key || '').toLowerCase().replace(/[\s-]+/g, '_').trim();
    const aliases: Record<string, string> = {
      // name variants
      'client_name':       'name',
      'full_name':         'name',
      'defendant_name':    'name',
      'accused_name':      'name',
      'first_name':        'given_name',
      'last_name':         'family_name',
      'surname':           'family_name',
      // age — has no profile target, normalise anyway
      'client_age':        'age',
      // charge variants
      'charge':            'proposed_offence',
      'charge_description':'proposed_offence',
      'primary_charge':    'proposed_offence',
      'offence':           'proposed_offence',
      'index_offence':     'proposed_offence',
      'charge_section':    'offence_section',
      'criminal_code_section':'offence_section',
      'section':           'offence_section',
      // jurisdiction variants
      'province':          'jurisdiction',
      'territory':         'jurisdiction',
      // community / nation variants
      'first_nation':      'nation',
      'nation_or_community':'community',
      'community_or_band': 'community',
      // indigenous variants
      'indigenous':        'indigenous_identity',
      'is_indigenous':     'indigenous_identity',
      'indigenous_status': 'indigenous_identity',
    };
    return aliases[k] || k;
  }

  const pendingSuggestions   = c.suggestions.filter((s) => s.status === 'pending');
  const appliedSuggestions   = c.suggestions.filter((s) => s.status === 'applied');
  const dismissedSuggestions = c.suggestions.filter((s) => s.status === 'dismissed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar breadcrumb="Intake (chat)" showPosterior={true} />

      {/* Phase progress strip */}
      <PhaseStrip
        phaseKey={c.phase}
        percent={c.percent}
        isComplete={c.isComplete}
      />

      {/* No-key banner */}
      {k.hydrated && !k.hasKey ? (
        <div
          style={{
            margin: '0 24px',
            border: '1px solid ' + PV.constraint + '55',
            background: PV.constraint + '10',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: PV.ink2,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{
            fontWeight: 700, color: PV.constraint,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            fontSize: 10,
          }}>
            No API key
          </span>
          <span style={{ flex: 1 }}>
            The intake interview requires an LLM. Configure a key in Settings to begin.
          </span>
          <Link
            href="/settings"
            style={{ fontSize: 11, fontWeight: 600, color: PV.distortion, textDecoration: 'underline' }}
          >
            Configure key →
          </Link>
        </div>
      ) : null}

      {/* Main split: chat (left) + sidebar (right) */}
      <div style={{
        flex: 1,
        display: 'flex',
        minHeight: 0,
        padding: '12px 24px 0',
        gap: 20,
      }}>

        {/* Chat column */}
        <div style={{
          flex: '1 1 60%',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          {/* Scrollback */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid ' + PV.border,
              background: PV.paper,
              borderRadius: 10,
              padding: 16,
              minHeight: 0,
            }}
          >
            {c.messages.length === 0 ? (
              <EmptyChatState hasKey={k.hasKey} />
            ) : (
              c.messages.map((m) => <ChatBubble key={m.id} m={m} />)
            )}
            {c.pending ? (
              <div style={{
                fontSize: 12, color: PV.ink3, fontStyle: 'italic',
                padding: '8px 12px',
              }}>
                PARVIS is thinking…
              </div>
            ) : null}
            {c.error ? (
              <div style={{
                fontSize: 11, color: PV.risk,
                fontFamily: 'monospace',
                padding: '8px 12px',
                marginTop: 8,
                background: PV.risk + '10',
                borderRadius: 4,
              }}>
                {c.error}
              </div>
            ) : null}
          </div>

          {/* Composer */}
          <div style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-end',
            paddingBottom: 16,
          }}>
            <textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the case in your own words. Enter to send, Shift+Enter for a newline."
              rows={2}
              style={{
                flex: 1,
                fontSize: 13,
                fontFamily: 'inherit',
                lineHeight: 1.5,
                padding: '10px 12px',
                border: '1px solid ' + PV.border,
                borderRadius: 8,
                background: PV.paper,
                resize: 'none',
                outline: 'none',
                minHeight: 44,
                maxHeight: 120,
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!composerText.trim() || c.pending}
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '10px 18px',
                background: composerText.trim() && !c.pending ? PV.ink : PV.paper3,
                color:      composerText.trim() && !c.pending ? '#fff' : PV.ink4,
                border: 'none',
                borderRadius: 4,
                cursor: composerText.trim() && !c.pending ? 'pointer' : 'not-allowed',
                minWidth: 80,
              }}
            >
              {c.pending ? '...' : 'send'}
            </button>
          </div>

          {/* Footer: clear-history + case label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            color: PV.ink4,
            paddingBottom: 12,
          }}>
            <span>case: {c.caseRef}</span>
            <span style={{ flex: 1 }} />
            {c.messages.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear chat history for this case? This cannot be undone.')) {
                    c.clearHistory();
                  }
                }}
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  padding: '5px 10px',
                  border: '1px solid ' + PV.risk + '55',
                  color: PV.risk,
                  background: 'transparent',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                clear history
              </button>
            ) : null}
          </div>
        </div>

        {/* Sidebar column */}
        <div style={{
          flex: '0 0 38%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          paddingBottom: 16,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: PV.ink3,
            marginBottom: 8,
          }}>
            Suggestions
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid ' + PV.border,
            background: PV.paper2,
            borderRadius: 10,
            padding: 12,
            minHeight: 0,
          }}>
            {pendingSuggestions.length === 0 &&
             appliedSuggestions.length === 0 &&
             dismissedSuggestions.length === 0 ? (
              <div style={{
                fontSize: 12,
                color: PV.ink3,
                fontStyle: 'italic',
                padding: 12,
                textAlign: 'center',
              }}>
                PARVIS will surface extracted fields here as the interview progresses.
                Apply a suggestion to write it into the case profile.
              </div>
            ) : null}

            {pendingSuggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                s={s}
                onApply={() => handleApply(s)}
                onDismiss={() => c.dismissSuggestion(s.id)}
              />
            ))}

            {appliedSuggestions.length > 0 ? (
              <CollapsedGroup label="Applied" count={appliedSuggestions.length}>
                {appliedSuggestions.map((s) => (
                  <SuggestionCard key={s.id} s={s} compact />
                ))}
              </CollapsedGroup>
            ) : null}

            {dismissedSuggestions.length > 0 ? (
              <CollapsedGroup label="Dismissed" count={dismissedSuggestions.length}>
                {dismissedSuggestions.map((s) => (
                  <SuggestionCard key={s.id} s={s} compact />
                ))}
              </CollapsedGroup>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────────────────────────────────── */
/* Phase progress strip                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function PhaseStrip(props: {
  phaseKey: string | null;
  percent:  number;
  isComplete: boolean;
}) {
  const activeIdx = props.phaseKey
    ? PHASE_ORDER.findIndex((p) => p.key === props.phaseKey)
    : PHASE_ORDER.length;

  return (
    <div style={{
      padding: '14px 24px',
      borderBottom: '1px solid ' + PV.border,
      background: PV.paper,
    }}>
      <div style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        marginBottom: 8,
      }}>
        {PHASE_ORDER.map((p, i) => {
          const isActive  = i === activeIdx;
          const isDone    = i < activeIdx || props.isComplete;
          const color     = isActive ? PV.distortion : isDone ? PV.mitigation : PV.ink4;
          const bg        = isActive ? PV.distortion + '15' :
                            isDone   ? PV.mitigation + '15' :
                                       PV.paper2;
          return (
            <div
              key={p.key}
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '5px 10px',
                background: bg,
                color: color,
                border: '1px solid ' + (isActive ? PV.distortion : 'transparent'),
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isDone && !isActive ? '✓ ' : ''}{p.label}
            </div>
          );
        })}
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 11,
          fontFamily: 'monospace',
          color: PV.ink3,
        }}>
          {props.percent.toFixed(0)}% complete
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3,
        background: PV.paper3,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(2, Math.min(100, props.percent))}%`,
          background: props.isComplete ? PV.mitigation : PV.distortion,
          transition: 'width 300ms ease',
        }} />
      </div>
    </div>
  );
}


/* ──────────────────────────────────────────────────────────────────────── */
/* Chat bubble                                                             */
/* ──────────────────────────────────────────────────────────────────────── */

function ChatBubble(props: { m: IntakeMessage }) {
  const m = props.m;
  const isUser = m.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: PV.ink4,
        marginBottom: 3,
        fontWeight: 700,
      }}>
        {isUser ? 'you' : 'parvis'}
      </div>
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: 10,
        background: isUser ? PV.ink : PV.paper2,
        color: isUser ? '#fff' : PV.ink,
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {m.content}
      </div>
    </div>
  );
}


function EmptyChatState(props: { hasKey: boolean }) {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      color: PV.ink3,
      fontSize: 13,
      fontStyle: 'italic',
      lineHeight: 1.6,
    }}>
      {props.hasKey ? (
        <>
          The interview hasn&apos;t started yet. Type anything to begin —
          PARVIS will open with the identity phase. <br /><br />
          A simple opener: <em>&ldquo;Ready to start.&rdquo;</em>
        </>
      ) : (
        <>
          The interview protocol is loaded but no LLM is configured.
          Add a key in Settings to begin.
        </>
      )}
    </div>
  );
}


/* ──────────────────────────────────────────────────────────────────────── */
/* Suggestion cards & collapsed groups                                     */
/* ──────────────────────────────────────────────────────────────────────── */

function SuggestionCard(props: {
  s:        IntakeSuggestion;
  onApply?: () => void;
  onDismiss?: () => void;
  compact?:   boolean;
}) {
  const s = props.s;
  const isApplied = s.status === 'applied';
  const isDismissed = s.status === 'dismissed';

  const accent =
    isApplied   ? PV.mitigation :
    isDismissed ? PV.ink4 :
                  PV.distortion;

  return (
    <div style={{
      border: '1px solid ' + PV.border,
      background: PV.paper,
      borderLeft: '3px solid ' + accent,
      borderRadius: 6,
      padding: props.compact ? '8px 10px' : '10px 12px',
      marginBottom: 8,
      opacity: isDismissed ? 0.55 : 1,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 700,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          {s.field}
        </span>
        {isApplied   ? <span style={{ fontSize: 9, color: PV.mitigation, fontWeight: 700 }}>✓ APPLIED</span> : null}
        {isDismissed ? <span style={{ fontSize: 9, color: PV.ink4,        fontWeight: 700 }}>DISMISSED</span> : null}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: PV.ink4, fontFamily: 'monospace' }}>
          turn {s.sourceTurnIndex} · {(s.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{
        fontSize: 13,
        color: PV.ink,
        marginBottom: 4,
        fontFamily: 'monospace',
        wordBreak: 'break-word',
      }}>
        {formatValue(s.value)}
      </div>

      {!props.compact && s.rationale ? (
        <div style={{
          fontSize: 11,
          color: PV.ink3,
          fontStyle: 'italic',
          lineHeight: 1.5,
          marginBottom: 8,
        }}>
          {s.rationale}
        </div>
      ) : null}

      {!props.compact && s.status === 'pending' ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={props.onApply}
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '5px 10px',
              background: PV.mitigation,
              color: '#fff',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            apply
          </button>
          <button
            type="button"
            onClick={props.onDismiss}
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '5px 10px',
              background: 'transparent',
              color: PV.ink3,
              border: '1px solid ' + PV.border,
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}


function CollapsedGroup(props: {
  label:    string;
  count:    number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          padding: '6px 4px',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: PV.ink3,
          cursor: 'pointer',
        }}
      >
        {open ? '▾' : '▸'} {props.label} ({props.count})
      </button>
      {open ? <div style={{ marginTop: 4 }}>{props.children}</div> : null}
    </div>
  );
}


function formatValue(v: any): string {
  if (v === null || v === undefined) return '(empty)';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
