'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { useSyncConflicts } from '@/lib/api/hooks/use-sync-conflicts';
import { formatAgeHours, hoursSince } from '@/lib/aging';
import type { SyncConflict } from '@/lib/api/types';
import { ConflictDetail } from './_components/conflict-detail';

/**
 * Conflits de synchronisation non résolus, en tête (contrat, `GET
 * /v1/sync/conflicts`, réservé MANAGER) : démarcheur, ancienneté, motif
 * lisible en français (livrable 3).
 */
export default function SynchronisationConflitsPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { data, isLoading } = useSyncConflicts({ resolved: false, limit: 100 });

  const conflicts = React.useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => (a.clientCreatedAt < b.clientCreatedAt ? -1 : 1));
  }, [data]);

  const selected = conflicts.find((c) => c.id === selectedId) ?? null;

  const columns = React.useMemo<ColumnDef<SyncConflict>[]>(
    () => [
      {
        header: 'Conflit',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-xs font-medium text-primary hover:underline"
            onClick={() => setSelectedId(row.original.id)}
          >
            {row.original.clientRef}
          </button>
        ),
      },
      { header: 'Démarcheur', cell: ({ row }) => row.original.collector.fullName },
      {
        header: 'Ancienneté',
        cell: ({ row }) => formatAgeHours(hoursSince(row.original.clientCreatedAt)),
      },
      { header: 'Motif', cell: ({ row }) => row.original.message },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conflits de synchronisation"
        description="Opérations hors ligne rejetées pour changement côté serveur pendant l'absence de connexion."
      />

      <DataTable
        columns={columns}
        data={conflicts}
        isLoading={isLoading}
        emptyTitle="Aucun conflit en attente"
        emptyDescription="Les opérations en conflit apparaissent ici tant qu'elles ne sont pas résolues."
      />

      {selected ? <ConflictDetail conflict={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
