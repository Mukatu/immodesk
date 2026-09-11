'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyXaf } from '@/components/business/money-xaf';
import { RemittanceStatusBadge } from '@/components/business/remittance-status-badge';
import { useCashRemittances } from '@/lib/api/hooks/use-cash-remittances';
import { REMITTANCE_STATUS_LABELS } from '@/lib/enum-labels';
import type { RemittanceStatus, RemittanceSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

export default function RemisesCaissePage() {
  const [status, setStatus] = React.useState<RemittanceStatus | ''>('SUBMITTED');
  const { data, isLoading } = useCashRemittances({ status: status || undefined, limit: PAGE_SIZE });
  const remittances = data?.items ?? [];

  const columns = React.useMemo<ColumnDef<RemittanceSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/caisse/remises/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      { header: 'Démarcheur', cell: ({ row }) => row.original.collectorName },
      { header: 'Déclaré', cell: ({ row }) => <MoneyXaf amount={row.original.declaredAmount} /> },
      { header: 'Attendu', cell: ({ row }) => <MoneyXaf amount={row.original.expectedAmount} /> },
      { header: 'Reçus', cell: ({ row }) => row.original.receiptsCount },
      {
        header: 'Statut',
        cell: ({ row }) => <RemittanceStatusBadge status={row.original.status} />,
      },
      {
        header: 'Ouverte le',
        cell: ({ row }) => new Date(row.original.openedAt).toLocaleDateString('fr-CG'),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Remises d'espèces"
        description="File des remises soumises par les démarcheurs, à contrôler avant dépôt en banque."
      />

      <div className="w-56 space-y-1">
        <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
          Statut
        </label>
        <EnumSelect<RemittanceStatus>
          id="status-filter"
          value={status}
          onValueChange={setStatus}
          labels={REMITTANCE_STATUS_LABELS}
          placeholder="Toutes les remises"
        />
      </div>

      <DataTable
        columns={columns}
        data={remittances}
        isLoading={isLoading}
        emptyTitle="Aucune remise"
        emptyDescription="Les remises apparaissent ici une fois soumises par un démarcheur."
      />
    </div>
  );
}
