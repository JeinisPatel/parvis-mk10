'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * React Query provider — wraps the app so any component can call useQuery
 * / useMutation. One client per browser tab; survives navigation.
 *
 * Tweak default options here (stale time, retry policy, etc.) when we
 * have a real sense of what feels right. For now: 60s stale time so the
 * posterior doesn't thrash, no automatic retry (errors surface visibly
 * during dev).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry:     false,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
