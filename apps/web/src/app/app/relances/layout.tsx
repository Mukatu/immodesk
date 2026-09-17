'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const RELANCES_NAV_ITEMS = [
  { href: '/app/relances', label: 'Paliers' },
  { href: '/app/relances/historique', label: 'Historique' },
];

/**
 * Layout de section « Relances » : sous-navigation locale entre les paliers
 * (règles) et l'historique des exécutions, même principe que
 * `banque/layout.tsx` et `gerance/layout.tsx`.
 */
export default function RelancesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav aria-label="Navigation relances" className="flex gap-1 border-b border-border pb-2">
        {RELANCES_NAV_ITEMS.map(({ href, label }) => {
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
