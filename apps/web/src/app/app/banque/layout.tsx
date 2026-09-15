'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const BANQUE_NAV_ITEMS = [
  { href: '/app/banque/releves', label: 'Relevés' },
  { href: '/app/banque/rapprochement', label: 'Rapprochement' },
  { href: '/app/banque/cheques', label: 'Chèques' },
];

/**
 * Layout de section « Banque » : sous-navigation locale entre les relevés,
 * le rapprochement et les chèques. Aucune logique métier ici — seulement la
 * navigation, sur le même principe que la navigation principale
 * (`app-shell.tsx`, mise en évidence via `usePathname`).
 */
export default function BanqueLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav aria-label="Navigation banque" className="flex gap-1 border-b border-border pb-2">
        {BANQUE_NAV_ITEMS.map(({ href, label }) => {
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
