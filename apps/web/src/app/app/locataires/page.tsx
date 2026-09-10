'use client';

import * as React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Search, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { PhoneDisplay } from '@/components/business/phone-display';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import type { Tenant } from '@/lib/api/types';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function LocatairesPage() {
  const [searchInput, setSearchInput] = React.useState('');
  const [q, setQ] = React.useState('');
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

  const { data, isLoading } = useTenants({ q: q || undefined, cursor, limit: PAGE_SIZE });

  const columns = React.useMemo<ColumnDef<Tenant>[]>(
    () => [
      {
        header: 'Nom',
        accessorKey: 'displayName',
        cell: ({ row }) => (
          <Link
            href={`/app/locataires/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.displayName}
          </Link>
        ),
      },
      {
        header: 'Téléphone',
        cell: ({ row }) => <PhoneDisplay phone={row.original.primaryPhone} />,
      },
      {
        header: 'Ville',
        cell: ({ row }) => row.original.city || '—',
      },
      {
        header: 'Profession',
        cell: ({ row }) => row.original.profession || '—',
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
        title="Locataires"
        description="Recherchez et gérez les locataires de votre portefeuille."
        actions={
          <Button asChild>
            <Link href="/app/locataires/nouveau">
              <UserPlus className="mr-2 size-4" aria-hidden="true" />
              Nouveau locataire
            </Link>
          </Button>
        }
      />

      <div className="max-w-sm">
        <label htmlFor="tenant-search" className="sr-only">
          Rechercher un nom ou un numéro
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="tenant-search"
            type="search"
            placeholder="Rechercher un nom ou un numéro"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun locataire"
        emptyDescription="Ajoutez votre premier locataire pour commencer."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
