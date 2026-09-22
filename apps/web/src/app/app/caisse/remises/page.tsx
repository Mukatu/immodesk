'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyXaf } from '@/components/business/money-xaf';
import { RemittanceStatusBadge } from '@/components/business/remittance-status-badge';
import { useContextPanel } from '@/components/layout/context-panel';
import { useCashRemittances } from '@/lib/api/hooks/use-cash-remittances';
import { useCashCollectors } from '@/lib/api/hooks/use-cash-collectors';
import { REMITTANCE_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { RemittanceStatus, RemittanceSummary } from '@/lib/api/types';

const REMITTANCE_TONE: Record<RemittanceStatus, 'ok' | 'info' | 'warning' | 'danger' | 'neutral'> =
  {
    OPEN: 'neutral',
    SUBMITTED: 'warning',
    VERIFIED: 'info',
    DEPOSITED: 'ok',
    REJECTED: 'danger',
    CANCELLED: 'neutral',
  };

const PAGE_SIZE = 20;

export default function RemisesCaissePage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedRemittanceId, setSelectedRemittanceId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<RemittanceStatus | ''>('SUBMITTED');
  const { data, isLoading } = useCashRemittances({ status: status || undefined, limit: PAGE_SIZE });
  const remittances = data?.items ?? [];
  const { data: collectorsData } = useCashCollectors();
  const collectorCapById = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const collector of collectorsData?.items ?? [])
      map.set(collector.userId, collector.capAmount);
    return map;
  }, [collectorsData]);

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedRemittanceId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(remittance: RemittanceSummary) {
    setSelectedRemittanceId(remittance.id);
    const cap = collectorCapById.get(remittance.collectorUserId);
    const overCap = cap !== undefined && cap > 0 && remittance.declaredAmount > cap;
    openContextPanel({
      title: 'Remise de caisse',
      blocks: [
        {
          type: 'identity',
          title: remittance.reference,
          subtitle: remittance.collectorName,
          badge: {
            label: REMITTANCE_STATUS_LABELS[remittance.status],
            tone: REMITTANCE_TONE[remittance.status],
          },
        },
        { type: 'metric', value: formatXaf(remittance.declaredAmount), label: 'Montant déclaré' },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Attendu', v: formatXaf(remittance.expectedAmount) },
            { k: 'Compté', v: formatXaf(remittance.countedAmount) },
            { k: 'Écart', v: formatXaf(remittance.varianceAmount) },
            { k: 'Nombre de reçus', v: remittance.receiptsCount },
            { k: 'Ouverte le', v: new Date(remittance.openedAt).toLocaleDateString('fr-CG') },
            {
              k: 'Soumise le',
              v: remittance.submittedAt
                ? new Date(remittance.submittedAt).toLocaleDateString('fr-CG')
                : '—',
            },
          ],
        },
        ...(overCap
          ? ([
              {
                type: 'alert',
                tone: 'warning',
                text: `Montant déclaré au-dessus du plafond de caisse du démarcheur (plafond : ${formatXaf(cap ?? 0)}).`,
              },
            ] as const)
          : []),
        {
          type: 'actions',
          actions: [
            {
              label: 'Voir la remise',
              primary: true,
              href: `/app/caisse/remises/${remittance.id}`,
            },
            { label: "Voir la vue d'ensemble de la caisse", href: '/app/caisse' },
          ],
        },
      ],
    });
  }

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
        onRowSelect={handleRowSelect}
        getRowLabel={(remittance) => `Ouvrir le détail de la remise ${remittance.reference}`}
        getRowClassName={(remittance) =>
          remittance.id === selectedRemittanceId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
