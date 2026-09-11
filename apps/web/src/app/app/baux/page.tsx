'use client';

import * as React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Search, FilePlus2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { LeaseStatusBadge } from '@/components/business/lease-status-badge';
import { useLeases } from '@/lib/api/hooks/use-leases';
import type { LeaseStatus, LeaseSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type QuickFilter = 'ALL' | 'ACTIVE' | 'ENDING_SOON' | 'TERMINATED' | 'DRAFT';

const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'ENDING_SOON', label: 'Fin de bail ≤ 90 jours' },
  { value: 'TERMINATED', label: 'Résiliés' },
  { value: 'DRAFT', label: 'Brouillons' },
];

function filterToParams(filter: QuickFilter): { status?: LeaseStatus; endingWithinDays?: number } {
  switch (filter) {
    case 'ACTIVE':
      return { status: 'ACTIVE' };
    case 'ENDING_SOON':
      return { status: 'ACTIVE', endingWithinDays: 90 };
    case 'TERMINATED':
      return { status: 'TERMINATED' };
    case 'DRAFT':
      return { status: 'DRAFT' };
    default:
      return {};
  }
}

export default function BauxPage() {
  const [searchInput, setSearchInput] = React.useState('');
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState<QuickFilter>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setCursor(undefined);
      setPreviousCursors([]);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function handleFilterChange(next: QuickFilter) {
    setFilter(next);
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const { data, isLoading } = useLeases({
    q: q || undefined,
    cursor,
    limit: PAGE_SIZE,
    ...filterToParams(filter),
  });

  const columns = React.useMemo<ColumnDef<LeaseSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/baux/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference ?? '—'}
          </Link>
        ),
      },
      {
        header: 'Lot',
        cell: ({ row }) => (
          <span>
            {row.original.unit.code} — {row.original.property.name}
          </span>
        ),
      },
      {
        header: 'Locataire',
        cell: ({ row }) => row.original.tenant.displayName,
      },
      {
        header: 'Loyer',
        cell: ({ row }) => <MoneyXaf amount={row.original.rentAmount} />,
      },
      {
        header: 'Échéance',
        cell: ({ row }) => `Le ${row.original.paymentDueDay}`,
      },
      {
        header: 'Statut',
        cell: ({ row }) => <LeaseStatusBadge status={row.original.status} />,
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
        title="Baux"
        description="Recherchez et gérez les baux de votre portefeuille."
        actions={
          <Button asChild>
            <Link href="/app/baux/nouveau">
              <FilePlus2 className="mr-2 size-4" aria-hidden="true" />
              Nouveau bail
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm flex-1">
          <label htmlFor="lease-search" className="sr-only">
            Rechercher une référence ou un locataire
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="lease-search"
              type="search"
              placeholder="Rechercher une référence ou un locataire"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres rapides">
          {QUICK_FILTERS.map((item) => (
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
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun bail"
        emptyDescription="Créez votre premier bail pour commencer."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
