'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PV } from '@/lib/tokens';
import { Glyph, ICON, type IconName } from './Glyph';

/**
 * Sidebar — left rail with the 4 audit phases.
 *
 * Each item is a Next.js <Link> so navigation is client-side and the
 * route URL is canonical (deep-linking, back/forward, sharing all work).
 * Active state is derived from `usePathname()`.
 *
 * Brand mark is the Ethical AI triangle logo loaded from /public, rendered
 * with mix-blend-mode: multiply so the black strokes dissolve into the
 * warm cream paper exactly like the Mk 8 Streamlit watermark.
 *
 * The reference drawer at the bottom holds utility links (Settings, Network
 * architecture) — these are infrastructure, not workflow, so they sit below
 * the four audit phases rather than alongside them.
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
    ],
  },
  {
    phase: '02 Doctrine', color: PV.dual,
    items: [
      { href: '/gladue', label: 'Gladue factors',          icon: 'feather', status: 'todo' },
      { href: '/sce',    label: 'SCE — Morris / Ellis',    icon: 'scale',   status: 'todo' },
      { href: '/risk',   label: 'Risk & distortions',      icon: 'shield',  status: 'todo' },
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
      className="w-64 flex-none bg-paper2 border-r border-border flex flex-col gap-4 overflow-hidden"
      style={{ padding: '22px 16px 18px 16px' }}
    >
      {/* Brand — Ethical AI mark + PARVIS wordmark */}
      <Link
        href="/"
        className="flex items-center gap-2.5 pb-3.5 border-b border-border hover:opacity-90 transition-opacity"
      >
        <img
          src="/parvis-mark.png"
          alt=""
          width={32}
          height={32}
          style={{ flex: '0 0 auto', mixBlendMode: 'multiply' }}
        />
        <div className="leading-tight">
          <div
            className="font-bold tracking-caps"
            style={{ fontSize: 14, color: PV.navy }}
          >
            PARVIS
          </div>
          <div
            className="font-serif italic text-ink3"
            style={{ fontSize: 12 }}
          >
            Mk 9
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
                  className="font-mono font-bold tracking-caps uppercase"
                  style={{ fontSize: 11, color: group.color }}
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
                          ? 'bg-paper3 text-ink font-semibold'
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
                        <span
                          className="font-mono text-ink3"
                          style={{ fontSize: 11 }}
                        >
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
          <Glyph d={ICON.gear ?? ICON.net} size={13} color={pathname === '/settings' ? PV.distortion : PV.ink3} />
          <span className="flex-1">Settings</span>
          <Glyph d={ICON.chevR} size={11} color={PV.ink4} />
        </Link>

        <Link
          href="/network"
          className={
            'flex items-center gap-2.5 rounded-lg transition-colors ' +
            (pathname === '/architecture'
              ? 'bg-paper3 text-ink'
              : 'bg-paper3 hover:bg-paper4 text-ink3 hover:text-ink2')
          }
          style={{ padding: '8px 10px', fontSize: 13 }}
        >
          <Glyph d={ICON.net} size={13} color={pathname === '/architecture' ? PV.distortion : PV.ink3} />
          <span className="flex-1">Network architecture</span>
          <Glyph d={ICON.chevR} size={11} color={PV.ink4} />
        </Link>
      </div>
    </aside>
  );
}