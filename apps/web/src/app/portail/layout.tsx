import { PortalAuthProvider } from '@/lib/auth/portal-auth-context';
import { PortalShell } from '@/components/layout/portal-shell';

/**
 * Layout racine du portail bailleur : session et jeton isolés de l'agence
 * (voir portal-auth-context.tsx, portal-client.ts). Aucune navigation d'agence
 * n'est accessible depuis ces pages.
 */
export default function PortailLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthProvider>
      <PortalShell>{children}</PortalShell>
    </PortalAuthProvider>
  );
}
