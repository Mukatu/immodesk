'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePortalAuth } from '@/lib/auth/portal-auth-context';
import { cn } from '@/lib/utils';

const PORTAL_NAV_ITEMS = [
  { href: '/portail', label: 'Accueil' },
  { href: '/portail/releves', label: 'Relevés' },
  { href: '/portail/reversements', label: 'Reversements' },
  { href: '/portail/encaissements', label: 'Encaissements' },
  { href: '/portail/quittances', label: 'Quittances' },
];

/**
 * Coquille du portail bailleur : navigation en lecture seule uniquement, jamais de
 * navigation d'agence. Le bandeau et la navigation ne s'affichent qu'une fois
 * authentifié (pas sur /portail/activer/*).
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, landlord, logout } = usePortalAuth();

  if (status !== 'authenticated' || !landlord) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-semibold">Portail bailleur</p>
          <p className="text-xs text-muted-foreground">{landlord.displayName}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => logout()}>
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          Se déconnecter
        </Button>
      </header>
      <nav
        aria-label="Navigation portail bailleur"
        className="flex flex-wrap gap-1 border-b border-border px-4 py-2 sm:px-6"
      >
        {PORTAL_NAV_ITEMS.map(({ href, label }) => {
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
