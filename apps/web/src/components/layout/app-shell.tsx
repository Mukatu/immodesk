'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';

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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ContextPanelProvider } from '@/components/layout/context-panel';
import { InstallPrompt } from '@/components/layout/install-prompt';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { SidebarNavList } from '@/components/layout/sidebar-nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

/** Persistance du repli de la sidebar (bureau uniquement, jamais appliqué au tiroir mobile). */
const SIDEBAR_COLLAPSED_KEY = 'immodesk.sidebar-collapsed';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/app"
      className="flex items-center gap-2 px-4 py-4 text-lg font-semibold text-foreground"
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        I
      </span>
      <span className={cn(collapsed && 'sr-only')}>Immodesk</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, status, logout, currentOrganization } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';
  // Drapeau de l'editeur, distinct du role dans l'organisation cliente : c'est
  // lui, et lui seul, qui decide de l'affichage du back-office.
  const isPlatformAdmin = user?.isPlatformAdmin ?? false;

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Lu après le premier rendu (pas dans l'initialiseur de useState) pour que le HTML
  // serveur et le premier rendu client coïncident : sinon React signale un écart
  // d'hydratation dès que localStorage contient une valeur différente du défaut.
  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');
    } catch {
      // Stockage indisponible (navigation privée stricte) : on reste en mode étendu.
    }
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Pas de persistance possible : le repli reste valable pour la session en cours.
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <ContextPanelProvider>
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card lg:flex',
            collapsed ? 'w-[66px]' : 'w-[232px]',
          )}
        >
          <Brand collapsed={collapsed} />
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <SidebarNavList
              isOwner={isOwner}
              isPlatformAdmin={isPlatformAdmin}
              collapsed={collapsed}
            />
          </div>
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation principale</SheetTitle>
            </SheetHeader>
            <Brand collapsed={false} />
            <div className="flex-1 overflow-y-auto border-t border-border px-2 py-4">
              <SidebarNavList
                isOwner={isOwner}
                isPlatformAdmin={isPlatformAdmin}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Ouvrir la navigation"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  aria-label={collapsed ? 'Étendre la navigation' : 'Réduire la navigation'}
                  aria-pressed={collapsed}
                  onClick={toggleCollapsed}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="size-4" aria-hidden="true" />
                  ) : (
                    <PanelLeftClose className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <OrgSwitcher />
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Paramètres" asChild>
                  <Link
                    href="/app/parametres"
                    aria-current={pathname.startsWith('/app/parametres') ? 'page' : undefined}
                  >
                    <Settings className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <ThemeToggle />
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
                        <span className="hidden text-sm font-medium sm:inline">
                          {user.fullName}
                        </span>
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
          </header>
          <main id="contenu-principal" className="w-full flex-1 px-4 py-8 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
      <InstallPrompt />
      <ServiceWorkerRegistration />
    </ContextPanelProvider>
  );
}
