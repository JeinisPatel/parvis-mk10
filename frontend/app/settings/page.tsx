'use client';

import { useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { PV } from '@/lib/tokens';
import { useApiKey, PROVIDER_META } from '@/lib/hooks/useApiKey';

export default function SettingsPage() {
  const k = useApiKey();
  const [draftKey, setDraftKey] = useState('');

  if (!k.hydrated) {
    return (
      <div>
        <TopBar breadcrumb="Settings" showPosterior={false} />
        <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 12, color: PV.ink3 }}>
          loading settings...
        </div>
      </div>
    );
  }

  const meta = PROVIDER_META[k.state.provider];
  const providers = ['anthropic', 'openai', 'gemini'] as const;

  function saveDraft() {
    if (!draftKey.trim()) return;
    k.setKey(draftKey.trim());
    setDraftKey('');
  }

  return (
    <div>
      <TopBar breadcrumb="Settings" showPosterior={false} />

      <div style={{ padding: '24px 36px 64px', maxWidth: 760 }}>

        <h1 style={{ fontSize: 26, fontWeight: 500, color: PV.ink, marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: PV.ink2, fontStyle: 'italic', maxWidth: 640, lineHeight: 1.6, marginBottom: 28 }}>
          Configure the application. The only setting today is the LLM API key
          used by the Document analyzer. The key persists to your browser local
          storage and is sent as a request header on each analysis call; it is
          never written to the PARVIS server.
        </p>

        <div style={{
          borderLeft: '4px solid ' + PV.distortion,
          paddingLeft: 12,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: PV.ink }}>
            Document analyzer LLM
          </div>
          <div style={{ fontSize: 13, fontStyle: 'italic', color: PV.ink3, marginTop: 2 }}>
            The node analysis layer in Documents uses an external LLM.
            Provide a key to enable it. Without one, upload and extraction
            still work; only LLM analysis is unavailable.
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PV.ink3, marginBottom: 8 }}>
            Provider
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {providers.map((p) => {
              const m = PROVIDER_META[p];
              const active = k.state.provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => k.setProvider(p)}
                  style={{
                    padding: '10px 14px',
                    background: active ? PV.distortion + '15' : PV.paper,
                    color: active ? PV.distortion : PV.ink2,
                    border: '1px solid ' + (active ? PV.distortion : PV.border),
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    minWidth: 180,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span>{m.label}</span>
                    {m.recommended ? (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 6px',
                        background: PV.mitigation + '22',
                        color: PV.mitigation,
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}>
                        rec
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 11, fontStyle: 'italic', color: PV.ink3, marginTop: 2 }}>
                    {m.envHint}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, fontStyle: 'italic', color: PV.ink3, marginTop: 8 }}>
            Need a key? <a href={meta.signupUrl} target="_blank" rel="noopener noreferrer" style={{ color: PV.distortion, textDecoration: 'underline' }}>Get one from {meta.label}</a> (opens in a new tab).
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PV.ink3, marginBottom: 8 }}>
            {k.hasKey ? 'Saved key' : 'API key'}
          </div>

          {k.hasKey ? (
            <div>
              <div style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '10px 12px',
                background: PV.paper2,
                border: '1px solid ' + PV.border,
                borderRadius: 6,
                fontFamily: 'monospace',
                fontSize: 13,
              }}>
                <span style={{ color: PV.ink2, flex: 1 }}>
                  {k.state.key.slice(0, 8) + '...' + k.state.key.slice(-4)}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: PV.ink4,
                }}>
                  untested
                </span>
              </div>
              <div style={{ fontSize: 11, fontStyle: 'italic', color: PV.ink3, marginTop: 6 }}>
                Saved {new Date(k.state.savedAt).toLocaleString()}; stored only in this browser local storage.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => k.clear()}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '7px 14px',
                    border: '1px solid ' + PV.risk + '55',
                    color: PV.risk,
                    background: 'transparent',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  clear key
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="password"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder={meta.keyPrefix + '...'}
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: '100%',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  padding: '9px 12px',
                  border: '1px solid ' + PV.border,
                  borderRadius: 4,
                  background: PV.paper,
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!draftKey.trim()}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '8px 16px',
                    background: draftKey.trim() ? PV.ink : PV.paper3,
                    color: draftKey.trim() ? '#fff' : PV.ink4,
                    border: 'none',
                    borderRadius: 4,
                    cursor: draftKey.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  save key
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{
          border: '1px solid ' + PV.constraint + '33',
          background: PV.constraint + '08',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: PV.constraint,
            marginBottom: 8,
          }}>
            Security note
          </div>
          <div style={{ fontSize: 13, color: PV.ink2, lineHeight: 1.6 }}>
            The key persists in your browser localStorage. Anyone with access
            to this browser profile can read it. The PARVIS backend reads the
            key from a request header on each analysis call; it is never
            logged or persisted server-side. If you suspect a leak, rotate the
            key at the provider console. Phase A.5 will move key management
            server-side under an authenticated session.
          </div>
        </div>

      </div>
    </div>
  );
}
