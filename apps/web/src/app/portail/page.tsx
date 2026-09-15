'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyXaf } from '@/components/business/money-xaf';
import { StatementStatusBadge } from '@/components/business/statement-status-badge';
import { PayoutStatusBadge } from '@/components/business/payout-status-badge';
import { EmptyState } from '@/components/business/empty-state';
import { usePortalAuth } from '@/lib/auth/portal-auth-context';
import { usePortalPayouts, usePortalStatements } from '@/lib/api/hooks/use-portal';

export default function PortailAccueilPage() {
  const { landlord } = usePortalAuth();
  const { data: statements } = usePortalStatements({ limit: 1 });
  const { data: payouts } = usePortalPayouts({ limit: 1 });

  const lastStatement = statements?.items[0] ?? null;
  const lastPayout = payouts?.items[0] ?? null;
  const amountToReceive =
    lastStatement && lastStatement.status !== 'PAID' && lastStatement.netPayableAmount > 0
      ? lastStatement.netPayableAmount
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bonjour {landlord?.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          Voici la situation de vos biens sous mandat de gestion.
        </p>
      </div>

      {landlord?.isDiaspora ? (
        <Card className="border-secondary">
          <CardContent className="pt-6 text-sm">
            <p className="font-medium">Reversement depuis l&apos;étranger</p>
            <p className="text-muted-foreground">
              Vos reversements sont exécutés par virement bancaire international vers votre compte
              déclaré. Comptez un délai supplémentaire par rapport à un reversement local au
              Congo-Brazzaville.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solde à percevoir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            <MoneyXaf amount={amountToReceive} />
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dernier relevé</CardTitle>
          </CardHeader>
          <CardContent>
            {lastStatement ? (
              <Link href="/portail/releves" className="block space-y-1 hover:underline">
                <p className="font-medium">{lastStatement.statementNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Période {lastStatement.periodStart.slice(0, 7)}
                </p>
                <div className="flex items-center gap-2">
                  <MoneyXaf amount={lastStatement.netPayableAmount} colorize />
                  <StatementStatusBadge status={lastStatement.status} />
                </div>
              </Link>
            ) : (
              <EmptyState title="Aucun relevé pour le moment" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dernier reversement</CardTitle>
          </CardHeader>
          <CardContent>
            {lastPayout ? (
              <Link href="/portail/reversements" className="block space-y-1 hover:underline">
                <p className="font-medium">{lastPayout.reference}</p>
                <div className="flex items-center gap-2">
                  <MoneyXaf amount={lastPayout.netAmount} />
                  <PayoutStatusBadge status={lastPayout.status} />
                </div>
              </Link>
            ) : (
              <EmptyState title="Aucun reversement pour le moment" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
