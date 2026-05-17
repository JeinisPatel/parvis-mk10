import type { Metadata } from 'next';
import { Sidebar }     from '@/components/Sidebar';
import { Providers }   from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title:       'PARVIS Mark 9',
  description: 'Bayesian sentencing audit — research prototype.',
};

/**
 * Root layout — every screen sits inside this shell.
 *
 *   ┌────────────┬──────────────────────────────────────────┐
 *   │  Sidebar   │   TopBar (inside each page)              │
 *   │  (phases)  ├──────────────────────────────────────────┤
 *   │            │   Page content                            │
 *   │            │                                          │
 *   └────────────┴──────────────────────────────────────────┘
 *
 * The TopBar isn't here because its breadcrumb varies per route and we
 * want each page to declare its own. Pages render `<TopBar breadcrumb="…" />`
 * as their first element; everything below is screen body.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full">
        <Providers>
          <div className="flex h-screen w-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 overflow-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
