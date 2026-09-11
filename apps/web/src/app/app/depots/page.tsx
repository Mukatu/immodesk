'use client';

import * as React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { DepositStatusBadge } from '@/components/business/deposit-status-badge';
import { useDepositsList, useDepositsSummary } from '@/lib/api/hooks/use-deposits';
import { DEPOSIT_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { DepositStatus, DepositSummary } from '@/lib/api/types';
import { DepositMovementDialog } from './_components/deposit-movement-dialog';

const PAGE_SIZE = 20;

type StatusFilter = 'ALL' | DepositStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  ...(Object.keys(DEPOSIT_STATUS_LABELS) as DepositStatus[]).map((value) => ({
    value,
    label: DEPOSIT_STATUS_LABELS[value],
  })),
];

function KpiTile({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <p className="text-3xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DepotsPage() {
  const [filter, setFilter] = React.useState<StatusFilter>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const summary = useDepositsSummary();
  const { data, isLoading } = useDepositsList({
    status: filter === 'ALL' ? undefined : filter,
    cursor,
    limit: PAGE_SIZE,
  });

  function handleFilterChange(next: StatusFilter) {
    setFilter(next);
    setCursor(undefined);
    setPreviousCursors([]);
  }

  function handleNextPage() {
    if (data?.pageInfo.nextCursor) {
      setPreviousCursors((prev) => [...prev, cursor ?? '']);
      setCursor(data.pageInfo.nextCursor);
    }
  }

  function handlePreviousPage() {
    setPreviousCursors((prev) => {
      const next = [...prev];
      const last = next.pop();
      setCursor(last || undefined);
      return next;
    });
  }

  const columns = React.useMemo<ColumnDef<DepositSummary>[]>(
    () => [
      {
        header: 'Bail',
        cell: ({ row }) => (
          <Link
            href={`/app/baux/${row.original.leaseId}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.leaseReference ?? '—'}
          </Link>
        ),
      },
      {
        header: 'Locataire',
        cell: ({ row }) => row.original.tenant.displayName,
      },
      {
        header: 'Lot',
        cell: ({ row }) => row.original.unit.code,
      },
      {
        header: 'Statut',
        cell: ({ row }) => <DepositStatusBadge status={row.original.status} />,
      },
      {
        header: 'Requis',
        cell: ({ row }) => <MoneyXaf amount={row.original.requiredAmount} />,
      },
      {
        header: 'Détenu',
        cell: ({ row }) => <MoneyXaf amount={row.original.heldAmount} />,
      },
      {
        header: '',
        id: 'actions',
        cell: ({ row }) => (
          <DepositMovementDialog
            leaseId={row.original.leaseId}
            heldAmount={row.original.heldAmount}
          />
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépôts de garantie"
        description="Suivez les dépôts détenus et les mouvements associés à chaque bail."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiTile
          label="Total détenu"
          value={formatXaf(summary.data?.heldTotal ?? 0)}
          isLoading={summary.isLoading}
        />
        <KpiTile
          label="À restituer"
          value={`${summary.data?.refundDueCount ?? 0} dépôt${(summary.data?.refundDueCount ?? 0) > 1 ? 's' : ''}`}
          isLoading={summary.isLoading}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={filter === item.value ? 'default' : 'outline'}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun dépôt"
        emptyDescription="Les dépôts de garantie apparaîtront ici dès l'activation des baux."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
