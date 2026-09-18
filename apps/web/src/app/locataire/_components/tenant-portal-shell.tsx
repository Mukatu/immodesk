'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTenantAuth } from '@/lib/auth/tenant-auth-context';
import { TENANT_PORTAL_LOGIN_PATH } from '@/app/locataire/_lib/tenant-portal-cookie';
import { cn } from '@/lib/utils';

const TENANT_NAV_ITEMS = [
  { href: '/locataire', label: 'Mes factures' },
  { href: '/locataire/virement', label: 'Déclarer un virement' },
];

/**
 * Coquille du portail locataire : navigation minimale, jamais de navigation
 * d'agence ni de bailleur. Le bandeau ne s'affiche qu'une fois authentifié
 * (pas sur /locataire/connexion), sur le modèle de `PortalShell` (bailleur).
 */
export function TenantPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, tenant, logout } = useTenantAuth();

  if (status !== 'authenticated' || !tenant) {
    return <>{children}</>;
  }

  function handleLogout() {
    logout();
    router.push(TENANT_PORTAL_LOGIN_PATH);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-semibold">Portail locataire</p>
          <p className="text-xs text-muted-foreground">{tenant.displayName}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          Se déconnecter
        </Button>
      </header>
      <nav
        aria-label="Navigation portail locataire"
        className="flex flex-wrap gap-1 border-b border-border px-4 py-2 sm:px-6"
      >
        {TENANT_NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                active && 'bg-secondary text-secondary-foreground',
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <main id="contenu-principal" className="flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
