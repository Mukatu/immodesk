'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

interface ParametresNavItem {
  href: string;
  label: string;
  visible?: (isOwner: boolean, canImportPortfolio: boolean) => boolean;
}

/**
 * Neuf destinations, dans l'ordre du menu déroulant qu'elles remplacent (retiré de
 * apps/web/src/components/layout/app-shell.tsx). « Équipe » n'en fait pas partie :
 * sa route (/app/equipe) est hors de cette section.
 */
const PARAMETRES_NAV_ITEMS: ParametresNavItem[] = [
  { href: '/app/parametres', label: 'Général' },
  { href: '/app/parametres/facturation', label: 'Facturation' },
  { href: '/app/parametres/paiements', label: 'Paiements' },
  { href: '/app/parametres/rapprochement', label: 'Rapprochement bancaire' },
  { href: '/app/parametres/contrat', label: 'Contrat' },
  { href: '/app/parametres/messages', label: 'Messages' },
  { href: '/app/parametres/webhooks', label: 'Webhooks', visible: (isOwner) => isOwner },
  { href: '/app/parametres/tarifs', label: 'Tarifs' },
  {
    href: '/app/parametres/import-portefeuille',
    label: 'Import de portefeuille',
    visible: (_isOwner, canImportPortfolio) => canImportPortfolio,
  },
];

/** L'onglet « Général » n'est actif que sur sa propre adresse (préfixe commun à tous les autres). */
function isActive(pathname: string, href: string): boolean {
  if (href === '/app/parametres') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Layout de section « Paramètres » : bande d'onglets faite de vrais liens, chacun
 * menant à sa propre adresse — pas `components/ui/tabs.tsx`, qui garde son état en
 * mémoire et masque des panneaux au lieu de naviguer. Même principe de
 * sous-navigation que `gerance/layout.tsx`, `banque/layout.tsx` et
 * `relances/layout.tsx`, avec un défilement horizontal en plus : neuf destinations
 * ne tiennent pas sur un petit écran, et la bande ne doit jamais faire déborder la
 * page entière.
 */
export default function ParametresLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentOrganization } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';
  const canImportPortfolio = isOwner || currentOrganization?.role === 'MANAGER';

  const items = PARAMETRES_NAV_ITEMS.filter(
    (item) => !item.visible || item.visible(isOwner, canImportPortfolio),
  );

  return (
    <div className="space-y-6">
      <nav aria-label="Navigation paramètres" className="overflow-x-auto border-b border-border">
        <div className="flex w-max gap-1 pb-2">
          {items.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  active && 'bg-secondary text-secondary-foreground',
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
