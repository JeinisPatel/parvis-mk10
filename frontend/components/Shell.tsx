'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

/**
 * Shell — decides the chrome for the current route.
 *
 * The landing ('/') is the POLYMATH front door: it renders full-bleed, with
 * no sidebar. Every workspace route renders inside the sidebar shell exactly
 * as Mk 9 did. Keeping this as a client component lets us branch on the path
 * without moving any route folders.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
