'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

import { EmptyState } from '@/components/business/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { href: '/app/admin', label: "Vue d'ensemble" },
  { href: '/app/admin/commissions', label: 'Approbation des commissions' },
  { href: '/app/admin/versements', label: 'Versements groupés' },
  { href: '/app/admin/abonnements-a-risque', label: 'Abonnements à risque' },
  { href: '/app/admin/contre-passations', label: 'Contre-passations' },
];

/**
 * Back-office plateforme (apport d'affaires, abonnements à risque). Aucun
 * rôle « plateforme/staff » n'est modélisé dans le contrat ni dans `Role`
 * (types.ts) : par cohérence avec l'écran des tarifs (phase 8), l'accès est
 * restreint côté composant au rôle OWNER de l'organisation courante — une
 * approximation documentée, pas un contrôle de rôle plateforme réel. Le
 * contrôle serveur (routes `/admin/*`) est seul faisant foi en production.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentOrganization, status } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';

  if (status === 'loading') return null;

  if (!isOwner) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Accès réservé"
        description="Cette section du back-office est réservée aux administrateurs de la plateforme."
      />
    );
  }

  return (
    <div className="space-y-8">
      <nav
        aria-label="Navigation du back-office"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {ADMIN_NAV.map(({ href, label }) => {
          const active = pathname === href;
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
      {children}
    </div>
  );
}
