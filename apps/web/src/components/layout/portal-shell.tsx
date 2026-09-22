'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, FileCheck2, Home, LogOut, ReceiptText, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { usePortalAuth } from '@/lib/auth/portal-auth-context';
import { cn } from '@/lib/utils';

const PORTAL_NAV_ITEMS = [
  { href: '/portail', label: 'Accueil', icon: Home },
  { href: '/portail/releves', label: 'Relevés', icon: ReceiptText },
  { href: '/portail/reversements', label: 'Reversements', icon: ArrowLeftRight },
  { href: '/portail/encaissements', label: 'Encaissements', icon: Wallet },
  { href: '/portail/quittances', label: 'Quittances', icon: FileCheck2 },
];

/**
 * Coquille du portail bailleur : navigation en lecture seule uniquement, jamais de
 * navigation d'agence. Le bandeau et la navigation ne s'affichent qu'une fois
 * authentifié (pas sur /portail/activer/*).
 *
 * Choix délibéré : pas de sidebar ici (contrairement à AppShell). Le portail n'expose
 * que 5 destinations en lecture seule à un public externe (bailleurs) sur un périmètre
 * qui ne grandira pas comme l'espace agence ; une barre horizontale reste plus simple et
 * suffisamment lisible, y compris sur mobile (elle passe déjà en lignes multiples via
 * `flex-wrap`). Le bandeau garde toutefois la bascule de thème pour rester cohérent avec
 * le reste de l'application.
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
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button type="button" variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="mr-2 size-4" aria-hidden="true" />
            Se déconnecter
          </Button>
        </div>
      </header>
      <nav
        aria-label="Navigation portail bailleur"
        className="flex flex-wrap gap-1 border-b border-border px-4 py-2 sm:px-6"
      >
        {PORTAL_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                active && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
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
