'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/business/empty-state';
import { StatusBadge } from '@/components/business/status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useReferralPartnerCommissions } from '@/lib/api/hooks/use-referral';
import { REFERRAL_COMMISSION_STATUS_LABELS } from '@/lib/enum-labels';
import type { ReferralCommissionStatus } from '@/lib/api/types';

const COMMISSION_STATUS_VARIANT: Record<
  ReferralCommissionStatus,
  'success' | 'secondary' | 'warning' | 'outline' | 'destructive'
> = {
  ACCRUED: 'secondary',
  APPROVED: 'warning',
  PAID: 'success',
  REVERSED: 'destructive',
  CANCELLED: 'outline',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-CG');
}

/**
 * Historique des versements : aucune route ne permet au partenaire de lister
 * ses propres `ReferralPayout` (seule `GET /admin/referral-payouts/{id}`
 * existe, réservée au rôle plateforme). Dérivé ici des commissions PAID,
 * groupées par `payoutId`, seules données auxquelles le partenaire a
 * légitimement accès.
 */
function derivePayoutHistory(
  commissions: { payoutId: string | null; amount: number; paidAt: string | null }[],
) {
  const byPayout = new Map<
    string,
    { payoutId: string; amount: number; count: number; paidAt: string | null }
  >();
  for (const c of commissions) {
    if (!c.payoutId) continue;
    const row = byPayout.get(c.payoutId) ?? {
      payoutId: c.payoutId,
      amount: 0,
      count: 0,
      paidAt: c.paidAt,
    };
    row.amount += c.amount;
    row.count += 1;
    byPayout.set(c.payoutId, row);
  }
  return [...byPayout.values()].sort((a, b) => ((a.paidAt ?? '') < (b.paidAt ?? '') ? 1 : -1));
}

export function CommissionsSection() {
  const { data, isLoading } = useReferralPartnerCommissions({ limit: 50 });
  const items = React.useMemo(() => data?.items ?? [], [data]);
  const totals = data?.totals;
  const payouts = React.useMemo(() => derivePayoutHistory(items), [items]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Provisionné</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyXaf amount={totals?.accrued ?? 0} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Approuvé</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyXaf amount={totals?.approved ?? 0} className="text-xl font-semibold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Payé</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyXaf amount={totals?.paid ?? 0} className="text-xl font-semibold" />
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Aucune commission pour l'instant" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Provisionnée le</TableHead>
              <TableHead>Payée le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <MoneyXaf amount={c.amount} />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={c.status}
                    labelOverride={REFERRAL_COMMISSION_STATUS_LABELS[c.status]}
                    variantOverride={COMMISSION_STATUS_VARIANT[c.status]}
                  />
                </TableCell>
                <TableCell>{formatDate(c.accruedAt)}</TableCell>
                <TableCell>{formatDate(c.paidAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Historique des versements</h3>
        {payouts.length === 0 ? (
          <EmptyState title="Aucun versement reçu pour l'instant" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versement</TableHead>
                <TableHead>Commissions incluses</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Payé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.payoutId}>
                  <TableCell className="font-mono text-xs">{p.payoutId}</TableCell>
                  <TableCell>{p.count}</TableCell>
                  <TableCell>
                    <MoneyXaf amount={p.amount} />
                  </TableCell>
                  <TableCell>{formatDate(p.paidAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
