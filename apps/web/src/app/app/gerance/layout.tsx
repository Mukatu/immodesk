'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const GERANCE_NAV_ITEMS = [
  { href: '/app/gerance/mandats', label: 'Mandats' },
  { href: '/app/gerance/depenses', label: 'Dépenses' },
  { href: '/app/gerance/commissions', label: 'Commissions' },
  { href: '/app/gerance/releves', label: 'Relevés' },
  { href: '/app/gerance/reversements', label: 'Reversements' },
];

/**
 * Layout de section « Gérance » : sous-navigation locale entre mandats, dépenses,
 * commissions, relevés de gérance et reversements. Même principe que
 * `banque/layout.tsx` — aucune logique métier ici, seulement la navigation.
 */
export default function GeranceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav
        aria-label="Navigation gérance"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
      >
        {GERANCE_NAV_ITEMS.map(({ href, label }) => {
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
      {children}
    </div>
  );
}
