'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { EnumSelect } from '@/components/business/enum-select';
import { SyncBatchStatusBadge } from '@/components/business/sync-batch-status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useContextPanel } from '@/components/layout/context-panel';
import { useSyncBatches } from '@/lib/api/hooks/use-sync-batches';
import { useSyncDevices } from '@/lib/api/hooks/use-sync-devices';
import { SYNC_BATCH_STATUS_LABELS } from '@/lib/enum-labels';
import type { SyncBatchStatus, SyncBatchSummary } from '@/lib/api/types';
import { BatchDetail } from './_components/batch-detail';

const PAGE_SIZE = 20;

const SYNC_BATCH_TONE: Record<SyncBatchStatus, 'ok' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  APPLIED: 'ok',
  PARTIALLY_APPLIED: 'warning',
  REJECTED: 'danger',
  FAILED: 'danger',
};

/**
 * File des lots de synchronisation hors ligne (contrat, `GET /v1/sync/batches`,
 * réservé MANAGER) : appareil, démarcheur, date de réception, statut et
 * compteurs reçus/appliqués/rejetés/en conflit, avec filtres démarcheur,
 * statut et période.
 */
export default function SynchronisationPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [collectorUserId, setCollectorUserId] = React.useState('');
  const [status, setStatus] = React.useState<SyncBatchStatus | ''>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null);
  const [selectedContextBatchId, setSelectedContextBatchId] = React.useState<string | null>(null);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  // Même bonus que /app/baux : la ligne dont le panneau contextuel affiche le
  // résumé reste repérable tant qu'il reste ouvert.
  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedContextBatchId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(batch: SyncBatchSummary) {
    setSelectedContextBatchId(batch.id);
    openContextPanel({
      title: 'Lot de synchronisation',
      blocks: [
        {
          type: 'identity',
          title: batch.batchRef,
          subtitle: `${batch.collector.fullName} · ${batch.deviceId}`,
          badge: {
            label: SYNC_BATCH_STATUS_LABELS[batch.status],
            tone: SYNC_BATCH_TONE[batch.status],
          },
        },
        {
          type: 'metric',
          value: batch.operationsCount,
          label: 'opérations reçues',
        },
        {
          type: 'keyvalue',
          title: 'Détail',
          items: [
            { k: 'Appliquées', v: batch.appliedCount },
            { k: 'Rejetées', v: batch.rejectedCount },
            { k: 'En conflit', v: batch.conflictsCount },
            { k: 'Plateforme', v: batch.devicePlatform ?? '—' },
            { k: 'Version app', v: batch.appVersion ?? '—' },
          ],
        },
        {
          type: 'activity',
          title: 'Chronologie',
          items: [
            { what: 'Lot reçu', when: new Date(batch.receivedAt).toLocaleString('fr-CG') },
            ...(batch.appliedAt
              ? [{ what: 'Lot appliqué', when: new Date(batch.appliedAt).toLocaleString('fr-CG') }]
              : []),
          ],
        },
        {
          type: 'actions',
          actions: [
            {
              label: 'Voir le détail des opérations',
              primary: true,
              keepOpen: true,
              onSelect: () => setSelectedBatchId(batch.id),
            },
          ],
        },
      ],
    });
  }

  const devicesQuery = useSyncDevices();
  const collectors = React.useMemo(() => {
    const seen = new Map<string, string>();
    for (const device of devicesQuery.data?.items ?? []) {
      seen.set(device.collector.userId, device.collector.fullName);
    }
    return [...seen.entries()];
  }, [devicesQuery.data]);

  const { data, isLoading } = useSyncBatches({
    collectorUserId: collectorUserId || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  const batches = data?.items ?? [];

  function resetPagination() {
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

  const columns = React.useMemo<ColumnDef<SyncBatchSummary>[]>(
    () => [
      {
        header: 'Lot',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-xs font-medium text-primary hover:underline"
            onClick={() => setSelectedBatchId(row.original.id)}
          >
            {row.original.batchRef}
          </button>
        ),
      },
      { header: 'Appareil', cell: ({ row }) => row.original.deviceId },
      { header: 'Démarcheur', cell: ({ row }) => row.original.collector.fullName },
      {
        header: 'Reçu le',
        cell: ({ row }) => new Date(row.original.receivedAt).toLocaleString('fr-CG'),
      },
      {
        header: 'Statut',
        cell: ({ row }) => <SyncBatchStatusBadge status={row.original.status} />,
      },
      { header: 'Reçues', cell: ({ row }) => row.original.operationsCount },
      { header: 'Appliquées', cell: ({ row }) => row.original.appliedCount },
      { header: 'Rejetées', cell: ({ row }) => row.original.rejectedCount },
      { header: 'En conflit', cell: ({ row }) => row.original.conflictsCount },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Synchronisation"
        description="Lots reçus des appareils démarcheurs hors ligne (contrat phase 5)."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56 space-y-1">
          <Label htmlFor="sync-collector-filter">Démarcheur</Label>
          <Select
            value={collectorUserId || undefined}
            onValueChange={(v) => {
              setCollectorUserId(v);
              resetPagination();
            }}
          >
            <SelectTrigger id="sync-collector-filter">
              <SelectValue placeholder="Tous les démarcheurs" />
            </SelectTrigger>
            <SelectContent>
              {collectors.map(([userId, fullName]) => (
                <SelectItem key={userId} value={userId}>
                  {fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-52 space-y-1">
          <Label htmlFor="sync-status-filter">Statut</Label>
          <EnumSelect<SyncBatchStatus>
            id="sync-status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={SYNC_BATCH_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="sync-from-filter">Du</Label>
          <input
            id="sync-from-filter"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPagination();
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sync-to-filter">Au</Label>
          <input
            id="sync-to-filter"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              resetPagination();
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={batches}
        isLoading={isLoading}
        emptyTitle="Aucun lot"
        emptyDescription="Les lots envoyés par les appareils démarcheurs apparaissent ici après synchronisation."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(batch) => `Voir le résumé du lot ${batch.batchRef}`}
        getRowClassName={(batch) =>
          batch.id === selectedContextBatchId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />

      {selectedBatchId ? (
        <BatchDetail batchId={selectedBatchId} onClose={() => setSelectedBatchId(null)} />
      ) : null}
    </div>
  );
}
