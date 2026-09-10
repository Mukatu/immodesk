'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentOrganizationId, subscribeTokenStore } from '@/lib/api/token-store';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Le cache est cloisonné par organisation : un changement d'organisation vide le cache
  // pour qu'aucune donnée d'un autre tenant ne subsiste en mémoire.
  const lastOrgId = React.useRef<string | null>(null);
  React.useEffect(() => {
    lastOrgId.current = getCurrentOrganizationId();
    return subscribeTokenStore(() => {
      const nextOrgId = getCurrentOrganizationId();
      if (nextOrgId !== lastOrgId.current) {
        lastOrgId.current = nextOrgId;
        queryClient.clear();
      }
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
