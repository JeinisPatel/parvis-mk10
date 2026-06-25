import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { Shell }     from '@/components/Shell';
import './globals.css';

export const metadata: Metadata = {
  title:       'PARVIS Mark 10',
  description: 'Probabilistic and Analytical Reasoning Virtual Intelligence System — a species of POLYMATH.',
};

/**
 * Root layout — every screen sits inside this shell.
 *
 * The sidebar lives in <Shell>, not here, because the landing ('/') renders
 * full-bleed without it. Workspace routes get the sidebar + scrolling main.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
