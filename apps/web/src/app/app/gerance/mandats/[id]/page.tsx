'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EmptyState } from '@/components/business/empty-state';
import { MandateStatusBadge } from '@/components/business/mandate-status-badge';
import { StatementStatusBadge } from '@/components/business/statement-status-badge';
import { DiasporaBadge } from '@/components/business/diaspora-badge';
import { useMandate, useActivateMandate } from '@/lib/api/hooks/use-mandates';
import { useLandlord } from '@/lib/api/hooks/use-landlords';
import { MANDATE_SCOPE_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { SuspendMandateDialog } from './_components/suspend-mandate-dialog';
import { TerminateMandateDialog } from './_components/terminate-mandate-dialog';
import { InviteLandlordButton } from './_components/invite-landlord-button';

export default function MandatDetailPage() {
  const params = useParams<{ id: string }>();
  const mandateId = params.id;
  const { data: mandate, isLoading } = useMandate(mandateId);
  const { data: landlord } = useLandlord(mandate?.landlordId ?? null);
  const activateMandate = useActivateMandate(mandateId);
  const [error, setError] = React.useState<string | null>(null);

  async function handleActivate() {
    setError(null);
    try {
      await activateMandate.mutateAsync();
      toast.success('Mandat activé.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!mandate) {
    return <EmptyState title="Mandat introuvable" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mandate.reference}
        description={`${mandate.landlord.displayName} — ${MANDATE_SCOPE_LABELS[mandate.scope ?? 'FULL_MANAGEMENT']}`}
        actions={
          <div className="flex items-center gap-2">
            <MandateStatusBadge status={mandate.status} />
            {landlord ? <DiasporaBadge isDiaspora={landlord.countryCode !== 'CG'} /> : null}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(mandate.status === 'DRAFT' || mandate.status === 'SUSPENDED') && (
          <Button type="button" onClick={handleActivate} disabled={activateMandate.isPending}>
            {activateMandate.isPending
              ? 'Activation…'
              : mandate.status === 'SUSPENDED'
                ? 'Réactiver'
                : 'Activer'}
          </Button>
        )}
        {mandate.status === 'ACTIVE' && <SuspendMandateDialog mandateId={mandate.id} />}
        {(mandate.status === 'ACTIVE' || mandate.status === 'SUSPENDED') && (
          <TerminateMandateDialog mandateId={mandate.id} />
        )}
      </div>
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Taux :{' '}
              <span className="font-medium">
                {mandate.commissionRateBps !== undefined && mandate.commissionRateBps !== null
                  ? `${(mandate.commissionRateBps / 100).toLocaleString('fr-FR')} %`
                  : '—'}
              </span>{' '}
              sur loyer encaissé
            </p>
            <p>
              TVA :{' '}
              <span className="font-medium">
                {mandate.vatRateBps !== undefined
                  ? `${(mandate.vatRateBps / 100).toLocaleString('fr-FR')} %`
                  : '—'}
              </span>
            </p>
            <p>
              Jour de reversement : <span className="font-medium">{mandate.payoutDay}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portail bailleur</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteLandlordButton mandateId={mandate.id} portal={mandate.landlordPortal} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Biens rattachés ({mandate.properties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {mandate.properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bien rattaché.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {mandate.properties.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                >
                  <Link
                    href={`/app/immeubles/${p.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span className="text-muted-foreground">
                    {p.district}, {p.city}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Relevés de gérance ({mandate.statements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mandate.statements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun relevé pour ce mandat pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {mandate.statements.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                >
                  <Link
                    href={`/app/gerance/releves/${s.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {s.statementNumber} — {s.periodStart.slice(0, 7)}
                  </Link>
                  <span className="flex items-center gap-2">
                    <MoneyXaf amount={s.netPayableAmount} colorize />
                    <StatementStatusBadge status={s.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
