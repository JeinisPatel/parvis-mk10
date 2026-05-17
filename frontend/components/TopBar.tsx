'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { runInference } from '@/lib/api';
import { PosteriorBadge } from './PosteriorBadge';
import { PV } from '@/lib/tokens';
import { readProfileSync, type CaseProfile } from '@/lib/hooks/useProfile';

interface Props {
  /** Eyebrow over the case title — e.g. "Case overview", "Risk & distortions". */
  breadcrumb?: string;
  /**
   * Whether to render the compact PosteriorBadge in the top-right.
   *
   * Defaults to `true`. The Overview page sets this to `false` because
   * the page body already renders the large PosteriorBadge as its
   * headline — showing it twice on the same screen is noisy.
   */
  showPosterior?: boolean;
}

/**
 * TopBar — persistent header for the workspace.
 *
 * Reads the case header (reference + court + jurisdiction) from the live
 * profile in localStorage. Re-reads when the storage event fires so changes
 * on the Profile page reflect here without a page refresh.
 *
 * The compact PosteriorBadge on the right uses the same React Query key as
 * the Overview's large badge — they share a single in-memory cache.
 */
export function TopBar({ breadcrumb = 'Case overview', showPosterior = true }: Props) {
  const profile = useLiveProfile();

  const { data } = useQuery({
    queryKey: ['posterior', 'demo-case'],
    queryFn: () =>
      runInference({
        evidence: { '5': 1, '6': 1, '7': 1, '8': 1, '9': 1, '17': 1 },
      }),
    enabled: showPosterior,
  });

  // Compose the case heading from the live profile, falling back to demo
  // values when no profile is saved yet.
  const reference = profile?.caseReference || 'R v Akwasi';
  const courtLine = composeCourtLine(profile);

  return (
    <header
      className="flex items-center justify-between border-b border-border bg-paper"
      style={{ padding: '14px 36px' }}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <div className="label-caps flex-none">{breadcrumb}</div>
        <div className="font-serif text-ink truncate" style={{ fontSize: 24 }}>
          {reference}
        </div>
        {courtLine && (
          <div
            className="font-serif italic text-ink3 ml-2 truncate"
            style={{ fontSize: 14 }}
          >
            {courtLine}
          </div>
        )}
      </div>

      {showPosterior && data && (
        <PosteriorBadge value={data.do_risk} size="sm" />
      )}
      {showPosterior && !data && (
        <div
          className="font-mono uppercase tracking-caps rounded border flex-none"
          style={{
            fontSize: 10,
            padding: '6px 10px',
            color: PV.ink4,
            borderColor: PV.border,
          }}
        >
          running VE…
        </div>
      )}
    </header>
  );
}


function composeCourtLine(profile: CaseProfile | null): string | null {
  if (!profile) return 'ONSC · Toronto';
  const parts: string[] = [];
  if (profile.court)        parts.push(profile.court);
  if (profile.jurisdiction) parts.push(profile.jurisdiction);
  if (parts.length === 0)   return null;
  return parts.join(' · ');
}


/**
 * Subscribes the component to localStorage profile changes, including
 * cross-tab updates (storage event) and same-tab updates (we listen to a
 * custom 'parvis-profile-updated' event the Profile page dispatches).
 *
 * Returns null until the first client-side read completes (SSR safety).
 */
function useLiveProfile(): CaseProfile | null {
  const [profile, setProfile] = useState<CaseProfile | null>(null);

  useEffect(() => {
    setProfile(readProfileSync());
    const reread = () => setProfile(readProfileSync());

    // Cross-tab updates (storage event fires when *other* tabs change it).
    window.addEventListener('storage', reread);

    // Same-tab updates: poll every 1.5s as a simple fallback. This is cheap
    // (localStorage reads are sub-millisecond) and avoids needing a custom
    // event bus. Phase A.5 replaces this with a real subscription.
    const t = setInterval(reread, 1500);

    return () => {
      window.removeEventListener('storage', reread);
      clearInterval(t);
    };
  }, []);

  return profile;
}