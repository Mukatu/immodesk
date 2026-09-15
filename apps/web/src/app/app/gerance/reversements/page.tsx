'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PayoutStatusBadge } from '@/components/business/payout-status-badge';
import { Button } from '@/components/ui/button';
import { useOwnerPayouts } from '@/lib/api/hooks/use-owner-payouts';
import type { Payout, PayoutStatus } from '@/lib/api/types';
import { ApprovePayoutButton } from './_components/approve-payout-button';
import { ExecutePayoutDialog } from './_components/execute-payout-dialog';
import { FailPayoutDialog } from './_components/fail-payout-dialog';

const STATUS_FILTERS: { value: PayoutStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'PAID', label: 'Reversés' },
  { value: 'FAILED', label: 'Échecs' },
];

export default function ReversementsPage() {
  const [status, setStatus] = React.useState<PayoutStatus | 'ALL'>('ALL');
  const { data, isLoading } = useOwnerPayouts({ status: status === 'ALL' ? undefined : status });

  const columns = React.useMemo<ColumnDef<Payout>[]>(
    () => [
      { header: 'Référence', cell: ({ row }) => row.original.reference },
      { header: 'Bailleur', cell: ({ row }) => row.original.landlord.displayName },
      { header: 'Montant net', cell: ({ row }) => <MoneyXaf amount={row.original.netAmount} /> },
      { header: 'Statut', cell: ({ row }) => <PayoutStatusBadge status={row.original.status} /> },
      {
        header: 'Motif d’échec',
        cell: ({ row }) => row.original.failureReason ?? '—',
      },
      {
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.status === 'PENDING' ? (
              <ApprovePayoutButton payoutId={row.original.id} />
            ) : null}
            {row.original.status === 'PENDING' ||
            row.original.status === 'APPROVED' ||
            row.original.status === 'FAILED' ? (
              <ExecutePayoutDialog payoutId={row.original.id} method={row.original.method} />
            ) : null}
            {row.original.status === 'PENDING' || row.original.status === 'APPROVED' ? (
              <FailPayoutDialog payoutId={row.original.id} />
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reversements"
        description="Reversements aux bailleurs : approbation, exécution et suivi des échecs."
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres de statut">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={status === item.value ? 'default' : 'outline'}
            onClick={() => setStatus(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun reversement"
        emptyDescription="Un reversement se crée depuis un relevé émis au solde positif."
      />
    </div>
  );
}
