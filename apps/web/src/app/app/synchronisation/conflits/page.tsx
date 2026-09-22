'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { useContextPanel } from '@/components/layout/context-panel';
import { useSyncConflicts } from '@/lib/api/hooks/use-sync-conflicts';
import { formatAgeHours, hoursSince } from '@/lib/aging';
import { formatXaf } from '@/lib/money';
import { INVOICE_STATUS_LABELS } from '@/lib/enum-labels';
import type { SyncConflict } from '@/lib/api/types';
import { ConflictDetail } from './_components/conflict-detail';

interface CashReceiptPayload {
  amount?: number;
  payerName?: string;
  invoiceId?: string;
}

function isCashReceiptPayload(value: unknown): value is CashReceiptPayload {
  return typeof value === 'object' && value !== null;
}

/**
 * Conflits de synchronisation non résolus, en tête (contrat, `GET
 * /v1/sync/conflicts`, réservé MANAGER) : démarcheur, ancienneté, motif
 * lisible en français (livrable 3).
 */
export default function SynchronisationConflitsPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = React.useState<string | null>(null);
  const { data, isLoading } = useSyncConflicts({ resolved: false, limit: 100 });

  const conflicts = React.useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => (a.clientCreatedAt < b.clientCreatedAt ? -1 : 1));
  }, [data]);

  const selected = conflicts.find((c) => c.id === selectedId) ?? null;

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedContextId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(conflict: SyncConflict) {
    setSelectedContextId(conflict.id);
    const payload = isCashReceiptPayload(conflict.payload) ? conflict.payload : {};
    const resolved = Boolean(conflict.resolvedAt);
    openContextPanel({
      title: 'Conflit de synchronisation',
      blocks: [
        {
          type: 'identity',
          title: `Conflit ${conflict.clientRef}`,
          subtitle: `${conflict.collector.fullName} · ${conflict.deviceId}`,
          badge: resolved
            ? {
                label: conflict.resolution === 'APPLIED' ? 'Appliqué' : 'Abandonné',
                tone: conflict.resolution === 'APPLIED' ? 'ok' : 'neutral',
              }
            : { label: 'Non résolu', tone: 'danger' },
        },
        {
          type: 'keyvalue',
          title: 'Les deux versions en présence',
          items: [
            {
              k: 'Montant déclaré hors ligne',
              v: typeof payload.amount === 'number' ? formatXaf(payload.amount) : '—',
            },
            { k: 'Payeur déclaré', v: payload.payerName ?? '—' },
            {
              k: 'Facture visée à l’origine',
              v: conflict.targetInvoice
                ? (conflict.targetInvoice.invoiceNumber ?? conflict.targetInvoice.id)
                : 'introuvable',
            },
            {
              k: 'Statut actuel de la facture',
              v: conflict.targetInvoice
                ? INVOICE_STATUS_LABELS[conflict.targetInvoice.status]
                : '—',
            },
            {
              k: 'Solde actuel de la facture',
              v: conflict.targetInvoice ? formatXaf(conflict.targetInvoice.balanceAmount) : '—',
            },
          ],
        },
        ...(resolved
          ? []
          : ([
              {
                type: 'alert',
                tone: 'danger',
                text: conflict.message,
              },
            ] as const)),
        {
          type: 'actions',
          actions: [
            {
              label: resolved ? 'Voir la résolution' : 'Résoudre le conflit',
              primary: true,
              onSelect: () => setSelectedId(conflict.id),
            },
          ],
        },
      ],
    });
  }

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
        onRowSelect={handleRowSelect}
        getRowLabel={(conflict) => `Voir le résumé du conflit ${conflict.clientRef}`}
        getRowClassName={(conflict) =>
          conflict.id === selectedContextId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />

      {selected ? <ConflictDetail conflict={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
