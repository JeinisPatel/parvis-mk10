'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crest } from '@/components/Crest';

/**
 * Landing — the POLYMATH front door for PARVIS (RATIO "gentle open").
 *
 * The crest draws itself in, then the P.A.R.V.I.S wordmark, its expansion,
 * the species line, the attribution, and the actions rise in on a stagger
 * (see globals.css). "Continue as guest" routes straight into the workspace
 * — pure button, no friction, matching RATIO. "Log in" is an inert
 * placeholder that reveals the accounts-coming-soon note.
 *
 * Animation classes and the prefers-reduced-motion fallback live in
 * globals.css so this stays declarative.
 */
export default function Landing() {
  const router = useRouter();
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-ground">
      {/* Masthead */}
      <header className="flex items-center justify-between border-b border-border2" style={{ padding: '22px 32px' }}>
        <span
          className="font-serif text-ink"
          style={{ fontSize: 16, letterSpacing: '0.05em' }}
        >
          P.A.R.V.I.S
        </span>
        <span className="font-mono uppercase text-ink4" style={{ fontSize: 12, letterSpacing: '0.14em' }}>
          Research prototype
        </span>
      </header>

      {/* Stage */}
      <main className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '56px 24px' }}>
        <Crest size={118} draw title="POLYMATH" />

        <div
          className="pv-rise pv-rise-1 font-serif text-ink"
          style={{ fontSize: 40, letterSpacing: '0.08em', marginTop: 30 }}
        >
          P.A.R.V.I.S
        </div>

        <div
          className="pv-rise pv-rise-2 font-serif text-ink2"
          style={{ fontSize: 13.5, letterSpacing: '0.02em', marginTop: 14, maxWidth: '30rem', lineHeight: 1.5 }}
        >
          Probabilistic and Analytical Reasoning Virtual Intelligence System
        </div>

        <div
          className="pv-rise pv-rise-3 font-serif italic text-ink3"
          style={{ fontSize: 15, marginTop: 16 }}
        >
          A Species of <span style={{ letterSpacing: '0.12em' }}>POLYMATH</span>
        </div>

        <div className="pv-rise pv-rise-4 font-ui text-ink3" style={{ fontSize: 14, marginTop: 10 }}>
          By Jeinis Patel, PhD Candidate
        </div>

        <div className="pv-rise pv-rise-5 flex items-center" style={{ gap: 16, marginTop: 38 }}>
          <button
            type="button"
            onClick={() => router.push('/overview')}
            className="font-ui rounded-md transition-colors"
            style={{ background: '#324153', color: '#F4F1EA', fontWeight: 500, fontSize: 18, padding: '14px 30px' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#222C38')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#324153')}
          >
            Continue as guest
          </button>
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="font-ui rounded-md transition-colors text-ink2 hover:bg-paper3"
            style={{ background: 'transparent', fontWeight: 500, fontSize: 16, padding: '12px 20px' }}
          >
            Log in
          </button>
        </div>

        {showNote && (
          <p className="font-ui text-ink3" style={{ fontSize: 14, marginTop: 18 }}>
            Accounts are coming soon — continue as a guest for now.
          </p>
        )}
      </main>
    </div>
  );
}
