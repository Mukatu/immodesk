'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Users2,
  Wallet,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/app/bailleurs', label: 'Bailleurs', icon: Home },
  { href: '/app/locataires', label: 'Locataires', icon: Users2 },
  { href: '/app/baux', label: 'Baux', icon: FileText },
  { href: '/app/depots', label: 'Dépôts', icon: Wallet },
  { href: '/app/immeubles', label: 'Immeubles', icon: Building2 },
  { href: '/app/equipe', label: 'Équipe', icon: Users },
  { href: '/app/parametres', label: 'Paramètres', icon: Settings },
];

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/app" className="text-lg font-semibold text-primary">
              Immodesk
            </Link>
            <OrgSwitcher />
          </div>
          <div className="flex items-center gap-3">
            {status === 'authenticated' && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 px-2"
                    aria-label="Menu du compte"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(user.fullName || user.phone)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">{user.fullName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user.phone}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void logout()}>
                    <LogOut className="mr-2 size-4" aria-hidden="true" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <nav aria-label="Navigation principale" className="mx-auto flex max-w-6xl gap-1 px-4 pb-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || (href !== '/app' && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  active && 'bg-secondary text-secondary-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main id="contenu-principal" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
