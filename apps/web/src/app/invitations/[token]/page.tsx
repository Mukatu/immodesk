'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcceptInvitation, useInvitationPreview } from '@/lib/api/hooks/use-invitations';
import { ApiError } from '@/lib/api/client';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Gestionnaire',
  COLLECTOR: 'Démarcheur',
  ACCOUNTANT: 'Comptable',
  VIEWER: 'Lecture seule',
};

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const { data: preview, isLoading, error } = useInvitationPreview(token);
  const acceptInvitation = useAcceptInvitation(token);
  const [accepted, setAccepted] = React.useState(false);

  async function handleAccept() {
    try {
      await acceptInvitation.mutateAsync();
      setAccepted(true);
      setTimeout(() => router.push('/app'), 1500);
    } catch {
      // erreur affichée via acceptInvitation.error
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation Immodesk</CardTitle>
          <CardDescription>Rejoindre une organisation existante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : error || !preview ? (
            <p className="text-sm text-destructive">
              {error instanceof ApiError
                ? error.message
                : 'Cette invitation est introuvable ou a expiré.'}
            </p>
          ) : accepted ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
              <p className="text-sm font-medium">
                Vous avez rejoint {preview.organizationName}. Redirection…
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm">
                Vous êtes invité(e) à rejoindre{' '}
                <span className="font-semibold">{preview.organizationName}</span> avec le rôle{' '}
                <span className="font-semibold">{ROLE_LABELS[preview.role] ?? preview.role}</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                Expire le {new Date(preview.expiresAt).toLocaleDateString('fr-FR')}
              </p>

              {acceptInvitation.error ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {acceptInvitation.error instanceof ApiError
                    ? acceptInvitation.error.message
                    : 'Impossible d’accepter l’invitation.'}
                </p>
              ) : null}

              {authStatus === 'authenticated' ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleAccept}
                  disabled={acceptInvitation.isPending}
                >
                  {acceptInvitation.isPending ? 'Acceptation…' : 'Accepter l’invitation'}
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href={`/login?next=/invitations/${token}`}>
                    Se connecter pour accepter
                  </Link>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
