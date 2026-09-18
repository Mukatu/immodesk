'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Handshake, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Espace partenaire (apport d'affaires) : session Immodesk normale (même
 * jeton que /app), pas un portail à jeton séparé — la route
 * `/referral-partners` exige seulement un utilisateur authentifié (contrat,
 * section « Apport d'affaires »). `middleware.ts` (hors périmètre de cet
 * agent) ne protège que /app, /onboarding et /portail : la garde ici est donc
 * assurée côté client, comme pour /onboarding avant lui.
 *
 * `/partenaire/confirmer/[registrationId]` est volontairement en dehors de ce
 * groupe de routes : cette page est publique (rôle « Public bailleur »), le
 * bailleur qui confirme n'a pas forcément de session Immodesk.
 */
export default function EspacePartenaireLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user, logout } = useAuth();

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/partenaire');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/partenaire"
            className="flex items-center gap-2 text-lg font-semibold text-primary"
          >
            <Handshake className="size-5" aria-hidden="true" />
            Immodesk partenaires
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.fullName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="mr-2 size-4" aria-hidden="true" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main id="contenu-principal" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
