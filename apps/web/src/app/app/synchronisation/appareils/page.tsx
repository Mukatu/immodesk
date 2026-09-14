'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import {
  DeviceFreshnessIndicator,
  DEVICE_SILENT_THRESHOLD_HOURS,
} from '@/components/business/device-freshness-indicator';
import { SyncBatchStatusBadge } from '@/components/business/sync-batch-status-badge';
import { useSyncDevices } from '@/lib/api/hooks/use-sync-devices';
import { hoursSince } from '@/lib/aging';
import type { DeviceStatus } from '@/lib/api/types';

/**
 * Supervision par démarcheur/appareil (contrat, `GET /v1/sync/devices`,
 * réservé MANAGER) : dernière synchronisation réussie, statut du dernier lot,
 * conflits en attente, total appliqué — appareils silencieux depuis plus de
 * 24 h mis en évidence (livrable 4).
 */
export default function SynchronisationAppareilsPage() {
  const { data, isLoading } = useSyncDevices();
  const devices = data?.items ?? [];

  const columns = React.useMemo<ColumnDef<DeviceStatus>[]>(
    () => [
      { header: 'Démarcheur', cell: ({ row }) => row.original.collector.fullName },
      {
        header: 'Appareil',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{row.original.deviceId}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.devicePlatform ?? '—'} · {row.original.appVersion ?? '—'}
            </span>
          </div>
        ),
      },
      {
        header: 'Dernière synchronisation',
        cell: ({ row }) => <DeviceFreshnessIndicator lastBatchAt={row.original.lastBatchAt} />,
      },
      {
        header: 'Dernier lot',
        cell: ({ row }) =>
          row.original.lastBatchStatus ? (
            <SyncBatchStatusBadge status={row.original.lastBatchStatus} />
          ) : (
            '—'
          ),
      },
      { header: 'Conflits en attente', cell: ({ row }) => row.original.pendingConflicts },
      { header: 'Total appliqué', cell: ({ row }) => row.original.totalApplied },
    ],
    [],
  );

  const rowClassName = React.useCallback((device: DeviceStatus) => {
    const silent =
      !device.lastBatchAt || hoursSince(device.lastBatchAt) > DEVICE_SILENT_THRESHOLD_HOURS;
    return silent ? 'bg-warning/10' : undefined;
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appareils"
        description="Un appareil silencieux depuis plus de 24 h est mis en évidence."
      />

      <DataTable
        columns={columns}
        data={devices}
        isLoading={isLoading}
        emptyTitle="Aucun appareil"
        emptyDescription="Les appareils apparaissent ici après leur première synchronisation."
        getRowClassName={rowClassName}
      />
    </div>
  );
}
