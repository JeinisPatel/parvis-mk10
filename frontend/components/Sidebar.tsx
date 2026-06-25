'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PV } from '@/lib/tokens';
import { Glyph, ICON, type IconName } from './Glyph';
import { Crest } from './Crest';

/**
 * Sidebar — left rail with the 4 audit phases.
 *
 * Each item is a Next.js <Link> so navigation is client-side and the route URL
 * is canonical. Active state is derived from `usePathname()`.
 *
 * Brand block is the POLYMATH crest + the P.A.R.V.I.S wordmark with its
 * "A Species of POLYMATH" species line. The crest is a real SVG now (Mk 9's
 * filter/mix-blend PNG trick is gone, so the white-background constraint is
 * gone with it). The brand links to /overview — the in-app home — since '/'
 * is now the POLYMATH landing.
 */

type Status = 'done' | 'partial' | 'todo';

interface NavItem {
  href:   string;
  label:  string;
  icon:   IconName;
  status: Status;
  count?: number;
}

interface NavGroup {
  phase: string;
  color: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    phase: '01 Intake', color: PV.constraint,
    items: [
      { href: '/profile',   label: 'Case profile',     icon: 'profile', status: 'todo' },
      { href: '/chat',      label: 'Intake (chat)',    icon: 'chat',    status: 'todo' },
      { href: '/record',    label: 'Criminal record',  icon: 'record',  status: 'todo' },
      { href: '/documents', label: 'Documents',        icon: 'doc',     status: 'todo' },
      { href: '/risk',      label: 'Risk & distortions', icon: 'shield', status: 'todo' },
    ],
  },
  {
    phase: '02 Doctrine', color: PV.dual,
    items: [
      { href: '/gladue', label: 'Gladue factors',       icon: 'feather', status: 'todo' },
      { href: '/sce',    label: 'SCE — Morris / Ellis', icon: 'scale',   status: 'todo' },
    ],
  },
  {
    phase: '03 Analysis', color: PV.distortion,
    items: [
      { href: '/inference', label: 'Inference',            icon: 'spark',  status: 'todo' },
      { href: '/scenarios', label: 'Scenarios',            icon: 'layers', status: 'todo' },
      { href: '/quantum',   label: 'Quantum (Appendix Q)', icon: 'atom',   status: 'todo' },
    ],
  },
  {
    phase: '04 Report', color: PV.output,
    items: [
      { href: '/audit', label: 'Audit report', icon: 'report', status: 'todo' },
    ],
  },
];

function StatusDot({ status }: { status: Status }) {
  const c =
    status === 'done'    ? PV.mitigation :
    status === 'partial' ? PV.constraint :
                           PV.border3;
  return (
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{ width: 6, height: 6, background: c, flex: '0 0 auto' }}
    />
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 flex-none bg-paper2 border-r border-border2 flex flex-col gap-4 overflow-hidden"
      style={{ padding: '22px 16px 18px 16px' }}
    >
      {/* Brand — POLYMATH crest + P.A.R.V.I.S lockup */}
      <Link
        href="/overview"
        className="flex items-center gap-2.5 pb-3.5 border-b border-border2 hover:opacity-90 transition-opacity"
      >
        <Crest size={30} title="POLYMATH" />
        <div className="leading-tight">
          <div
            className="font-serif text-ink"
            style={{ fontSize: 14, letterSpacing: '0.05em' }}
          >
            P.A.R.V.I.S
          </div>
          <div
            className="font-serif italic text-ink3"
            style={{ fontSize: 11 }}
          >
            A Species of <span style={{ letterSpacing: '0.1em' }}>POLYMATH</span>
          </div>
        </div>
      </Link>

      {/* Phase groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-3.5">
        {NAV.map((group) => {
          const done = group.items.filter((it) => it.status === 'done').length;
          return (
            <div key={group.phase}>
              <div className="flex items-baseline justify-between mb-1.5 px-1">
                <span
                  className="font-mono tracking-caps uppercase"
                  style={{ fontSize: 11, color: group.color, fontWeight: 500 }}
                >
                  {group.phase}
                </span>
                <span className="font-mono text-ink4" style={{ fontSize: 11 }}>
                  {done}/{group.items.length}
                </span>
              </div>
              <div className="flex flex-col">
                {group.items.map((it) => {
                  const active = pathname === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={
                        'flex items-center rounded-md transition-colors ' +
                        (active
                          ? 'bg-paper3 text-ink font-medium'
                          : 'text-ink2 hover:bg-paper3 hover:text-ink')
                      }
                      style={{
                        gap: 9,
                        padding: '6px 8px',
                        fontSize: 14,
                        borderLeft: active ? `2px solid ${group.color}` : '2px solid transparent',
                        marginLeft: active ? -2 : 0,
                        paddingLeft: active ? 6 : 8,
                      }}
                    >
                      <Glyph
                        d={ICON[it.icon]}
                        size={13}
                        color={active ? group.color : PV.ink3}
                      />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.count != null && it.count > 0 && (
                        <span className="font-mono text-ink3" style={{ fontSize: 11 }}>
                          {it.count}
                        </span>
                      )}
                      <StatusDot status={it.status} />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reference drawer — infrastructure links below the audit phases */}
      <div className="flex flex-col gap-1.5">
        <Link
          href="/settings"
          className={
            'flex items-center gap-2.5 rounded-lg transition-colors ' +
            (pathname === '/settings'
              ? 'bg-paper3 text-ink'
              : 'bg-paper3 hover:bg-paper4 text-ink3 hover:text-ink2')
          }
          style={{ padding: '8px 10px', fontSize: 13 }}
        >
          <Glyph d={ICON.gear ?? ICON.net} size={13} color={pathname === '/settings' ? PV.slate : PV.ink3} />
          <span className="flex-1">Settings</span>
          <Glyph d={ICON.chevR} size={11} color={PV.ink4} />
        </Link>

        <Link
          href="/network"
          className={
            'flex items-center gap-2.5 rounded-lg transition-colors ' +
            (pathname === '/network'
              ? 'bg-paper3 text-ink'
              : 'bg-paper3 hover:bg-paper4 text-ink3 hover:text-ink2')
          }
          style={{ padding: '8px 10px', fontSize: 13 }}
        >
          <Glyph d={ICON.net} size={13} color={pathname === '/network' ? PV.slate : PV.ink3} />
          <span className="flex-1">Network architecture</span>
          <Glyph d={ICON.chevR} size={11} color={PV.ink4} />
        </Link>
      </div>
    </aside>
  );
}
