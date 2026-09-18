'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { StatusBadge } from '@/components/business/status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useAtRiskSubscriptions } from '@/lib/api/hooks/use-admin-referrals';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/enum-labels';
import type { SubscriptionStatus } from '@/lib/api/types';

const SUBSCRIPTION_STATUS_VARIANT: Partial<Record<SubscriptionStatus, 'warning' | 'destructive'>> =
  {
    PAST_DUE: 'warning',
    SUSPENDED: 'destructive',
  };

export default function AbonnementsARisquePage() {
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const { data, isLoading } = useAtRiskSubscriptions({ limit: 20, cursor });
  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abonnements à risque"
        description="Organisations en impayé (PAST_DUE) ou déjà suspendues (SUSPENDED), triées par ancienneté de retard."
      />

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState title="Aucun abonnement à risque pour l'instant" />
      ) : null}

      {!isLoading && items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Factures en retard</TableHead>
              <TableHead>Montant en retard</TableHead>
              <TableHead>Jours de retard</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((sub) => (
              <TableRow key={sub.organizationId}>
                <TableCell className="font-medium">{sub.organizationName}</TableCell>
                <TableCell className="text-muted-foreground">{sub.planCode}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={sub.status}
                    labelOverride={SUBSCRIPTION_STATUS_LABELS[sub.status]}
                    variantOverride={SUBSCRIPTION_STATUS_VARIANT[sub.status] ?? 'outline'}
                  />
                </TableCell>
                <TableCell>{sub.overdueInvoicesCount}</TableCell>
                <TableCell>
                  <MoneyXaf amount={sub.overdueAmount} />
                </TableCell>
                <TableCell>{sub.daysPastDue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {data?.pageInfo.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCursor(data.pageInfo.nextCursor ?? undefined)}
        >
          Voir plus
        </Button>
      ) : null}
    </div>
  );
}
