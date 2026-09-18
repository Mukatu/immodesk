import { TenantAuthProvider } from '@/lib/auth/tenant-auth-context';
import { TenantPortalShell } from '@/app/locataire/_components/tenant-portal-shell';
import { TenantSessionFlag } from '@/app/locataire/_components/tenant-session-flag';

/**
 * Layout racine du portail locataire : session OTP isolée de l'agence et du
 * bailleur (voir tenant-auth-context.tsx, tenant-client.ts). Aucune
 * navigation d'agence n'est accessible depuis ces pages.
 */
export default function LocataireLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantAuthProvider>
      <TenantSessionFlag />
      <TenantPortalShell>{children}</TenantPortalShell>
    </TenantAuthProvider>
  );
}
