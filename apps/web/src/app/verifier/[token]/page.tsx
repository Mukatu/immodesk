'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { BadgeCheck, ShieldOff } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { apiFetch, ApiError } from '@/lib/api/client';
import { RECEIPT_STATUS_LABELS } from '@/lib/enum-labels';
import type { ReceiptVerification } from '@/lib/api/types';

/**
 * Page publique de vérification d'une quittance — sans authentification, sans
 * organisation courante. N'affiche que les champs autorisés par le contrat
 * (jamais le téléphone ni l'adresse du locataire).
 */
export default function VerifierQuittancePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'ok'; data: ReceiptVerification }
    | { status: 'not-found' }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<ReceiptVerification>(`/public/receipts/verify/${token}`, {
      skipAuth: true,
      organizationId: null,
    })
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', data });
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: 'not-found' });
        } else {
          setState({
            status: 'error',
            message: 'Impossible de vérifier cette quittance pour le moment.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      {state.status === 'loading' ? <Skeleton className="h-72 w-full max-w-md" /> : null}

      {state.status === 'not-found' ? (
        <EmptyState
          icon={ShieldOff}
          title="Lien de vérification invalide"
          description="Ce lien ne correspond à aucune quittance connue. Vérifiez qu'il a été copié en entier."
          className="max-w-md bg-background"
        />
      ) : null}

      {state.status === 'error' ? (
        <EmptyState
          icon={ShieldOff}
          title="Vérification indisponible"
          description={state.message}
          className="max-w-md bg-background"
        />
      ) : null}

      {state.status === 'ok' ? (
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <div className="flex size-10 items-center justify-center rounded-full bg-success text-success-foreground">
              <BadgeCheck className="size-6" aria-hidden="true" />
            </div>
            <div>
              <CardTitle>Quittance authentique</CardTitle>
              <p className="text-sm text-muted-foreground">{state.data.organizationName}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
              <dt className="font-medium text-muted-foreground">Numéro</dt>
              <dd>{state.data.receiptNumber}</dd>
              <dt className="font-medium text-muted-foreground">Date d&apos;émission</dt>
              <dd>{state.data.issueDate}</dd>
              <dt className="font-medium text-muted-foreground">Période</dt>
              <dd>{state.data.period ?? '—'}</dd>
              <dt className="font-medium text-muted-foreground">Montant</dt>
              <dd>
                <MoneyXaf amount={state.data.totalAmount} />
              </dd>
              <dt className="font-medium text-muted-foreground">Bailleur</dt>
              <dd>{state.data.landlordDisplayName}</dd>
              <dt className="font-medium text-muted-foreground">Statut</dt>
              <dd>{RECEIPT_STATUS_LABELS[state.data.status]}</dd>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
