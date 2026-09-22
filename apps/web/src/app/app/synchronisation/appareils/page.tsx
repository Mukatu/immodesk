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
import { useContextPanel } from '@/components/layout/context-panel';
import { useSyncDevices } from '@/lib/api/hooks/use-sync-devices';
import { formatAgeHours, hoursSince } from '@/lib/aging';
import { SYNC_BATCH_STATUS_LABELS } from '@/lib/enum-labels';
import type { DeviceStatus, SyncBatchStatus } from '@/lib/api/types';

const SYNC_BATCH_TONE: Record<SyncBatchStatus, 'ok' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  APPLIED: 'ok',
  PARTIALLY_APPLIED: 'warning',
  REJECTED: 'danger',
  FAILED: 'danger',
};

/**
 * Supervision par démarcheur/appareil (contrat, `GET /v1/sync/devices`,
 * réservé MANAGER) : dernière synchronisation réussie, statut du dernier lot,
 * conflits en attente, total appliqué — appareils silencieux depuis plus de
 * 24 h mis en évidence (livrable 4).
 */
export default function SynchronisationAppareilsPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<string | null>(null);
  const { data, isLoading } = useSyncDevices();
  const devices = data?.items ?? [];

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedDeviceId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(device: DeviceStatus) {
    setSelectedDeviceId(device.deviceId);
    const silent =
      !device.lastBatchAt || hoursSince(device.lastBatchAt) > DEVICE_SILENT_THRESHOLD_HOURS;
    openContextPanel({
      title: 'Appareil',
      blocks: [
        {
          type: 'identity',
          title: device.collector.fullName,
          subtitle: device.deviceId,
          badge: device.lastBatchStatus
            ? {
                label: SYNC_BATCH_STATUS_LABELS[device.lastBatchStatus],
                tone: SYNC_BATCH_TONE[device.lastBatchStatus],
              }
            : { label: 'Jamais synchronisé', tone: 'danger' },
        },
        {
          type: 'metric',
          value: device.lastBatchAt ? formatAgeHours(hoursSince(device.lastBatchAt)) : 'Jamais',
          label: device.lastBatchAt
            ? 'depuis la dernière synchronisation'
            : 'aucune synchronisation reçue',
        },
        {
          type: 'keyvalue',
          title: 'Détail',
          items: [
            { k: 'Démarcheur', v: device.collector.fullName },
            { k: 'Plateforme', v: device.devicePlatform ?? '—' },
            { k: 'Version app', v: device.appVersion ?? '—' },
            { k: 'Conflits en attente', v: device.pendingConflicts },
            { k: 'Total appliqué', v: device.totalApplied },
          ],
        },
        ...(silent
          ? ([
              {
                type: 'alert',
                tone: 'danger',
                text: 'Aucune synchronisation reçue depuis plus de 24 h.',
              },
            ] as const)
          : []),
        ...(device.pendingConflicts > 0
          ? ([
              {
                type: 'alert',
                tone: 'warning',
                text: `${device.pendingConflicts} conflit(s) en attente de résolution pour cet appareil.`,
              },
            ] as const)
          : []),
        {
          type: 'actions',
          actions: [
            {
              label: 'Voir les lots de synchronisation',
              primary: true,
              href: '/app/synchronisation',
            },
            { label: 'Voir les conflits en attente', href: '/app/synchronisation/conflits' },
          ],
        },
      ],
    });
  }

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

  const rowClassName = React.useCallback(
    (device: DeviceStatus) => {
      if (device.deviceId === selectedDeviceId) {
        return 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent';
      }
      const silent =
        !device.lastBatchAt || hoursSince(device.lastBatchAt) > DEVICE_SILENT_THRESHOLD_HOURS;
      return silent ? 'bg-warning/10' : undefined;
    },
    [selectedDeviceId],
  );

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
        onRowSelect={handleRowSelect}
        getRowLabel={(device) => `Voir le résumé de l'appareil de ${device.collector.fullName}`}
      />
    </div>
  );
}
