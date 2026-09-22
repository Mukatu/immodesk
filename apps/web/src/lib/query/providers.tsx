'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';

import { AuthProvider } from '@/lib/auth/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { getCurrentOrganizationId, subscribeTokenStore } from '@/lib/api/token-store';

/**
 * Chemins sur lesquels le thème est figé en clair plutôt que piloté par l'utilisateur ou
 * le système. Un seul `<ThemeProvider>` (racine, ci-dessous) existe dans l'app : next-themes
 * ignore silencieusement tout `<ThemeProvider>` imbriqué (il détecte le contexte déjà
 * présent et se contente de rendre `children`), donc le figeage se fait ici via la prop
 * `forcedTheme`, recalculée selon la route courante — pas via un second provider imbriqué
 * dans les layouts concernés.
 */
function isForcedLightRoute(pathname: string | null): boolean {
  // Portail locataire : aucun <ThemeToggle> n'y est exposé (cf. tenant-portal-shell.tsx),
  // contrairement à l'app agence et au portail bailleur qui en ont chacun un. Sans bascule
  // explicite, le thème sombre n'y est jamais choisi par l'utilisateur — il ne peut venir
  // que de `prefers-color-scheme`, en silence, sur des écrans jamais vérifiés dans ce
  // thème. On fige donc ce portail en clair plutôt que de laisser le thème système
  // l'activer à son insu.
  return pathname === '/locataire' || (pathname?.startsWith('/locataire/') ?? false);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const forcedTheme = isForcedLightRoute(pathname) ? 'light' : undefined;
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
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem forcedTheme={forcedTheme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
