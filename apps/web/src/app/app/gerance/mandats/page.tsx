'use client';

import * as React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { FilePlus2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MandateStatusBadge } from '@/components/business/mandate-status-badge';
import { DiasporaBadge } from '@/components/business/diaspora-badge';
import { useMandates } from '@/lib/api/hooks/use-mandates';
import type { MandateStatus, MandateSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: MandateStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'SUSPENDED', label: 'Suspendus' },
  { value: 'TERMINATED', label: 'Résiliés' },
];

export default function MandatsPage() {
  const [filter, setFilter] = React.useState<MandateStatus | 'ALL'>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  function handleFilterChange(next: MandateStatus | 'ALL') {
    setFilter(next);
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const { data, isLoading } = useMandates({
    status: filter === 'ALL' ? undefined : filter,
    cursor,
    limit: PAGE_SIZE,
  });

  const columns = React.useMemo<ColumnDef<MandateSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/gerance/mandats/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        header: 'Bailleur',
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            {row.original.landlord.displayName}
            <DiasporaBadge isDiaspora={row.original.landlord.isDiaspora} />
          </span>
        ),
      },
      { header: 'Biens', cell: ({ row }) => row.original.propertiesCount },
      {
        header: 'Commission',
        cell: ({ row }) =>
          row.original.commissionRateBps !== null
            ? `${(row.original.commissionRateBps / 100).toLocaleString('fr-FR')} %`
            : '—',
      },
      { header: 'Début', cell: ({ row }) => row.original.startDate },
      {
        header: 'Statut',
        cell: ({ row }) => <MandateStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mandats de gestion"
        description="Bailleurs sous mandat, biens rattachés et cycle de vie du mandat."
        actions={
          <Button asChild>
            <Link href="/app/gerance/mandats/nouveau">
              <FilePlus2 className="mr-2 size-4" aria-hidden="true" />
              Nouveau mandat
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres de statut">
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
        emptyTitle="Aucun mandat"
        emptyDescription="Créez votre premier mandat de gestion pour un bailleur."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
