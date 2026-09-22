'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PayoutStatusBadge } from '@/components/business/payout-status-badge';
import { Button } from '@/components/ui/button';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useOwnerPayouts } from '@/lib/api/hooks/use-owner-payouts';
import { PAYMENT_METHOD_LABELS, PAYOUT_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { Payout, PayoutStatus } from '@/lib/api/types';
import { ApprovePayoutButton } from './_components/approve-payout-button';
import { ExecutePayoutDialog } from './_components/execute-payout-dialog';
import { FailPayoutDialog } from './_components/fail-payout-dialog';

const STATUS_FILTERS: { value: PayoutStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'PAID', label: 'Reversés' },
  { value: 'FAILED', label: 'Échecs' },
];

const PAYOUT_TONE: Record<PayoutStatus, ContextPanelTone> = {
  PENDING: 'neutral',
  APPROVED: 'info',
  PROCESSING: 'warning',
  PAID: 'ok',
  FAILED: 'danger',
  CANCELLED: 'danger',
};

export default function ReversementsPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedPayoutId, setSelectedPayoutId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<PayoutStatus | 'ALL'>('ALL');
  const { data, isLoading } = useOwnerPayouts({ status: status === 'ALL' ? undefined : status });

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedPayoutId(null);
  }, [isContextPanelOpen]);

  const columns = React.useMemo<ColumnDef<Payout>[]>(
    () => [
      { header: 'Référence', cell: ({ row }) => row.original.reference },
      { header: 'Bailleur', cell: ({ row }) => row.original.landlord.displayName },
      { header: 'Montant net', cell: ({ row }) => <MoneyXaf amount={row.original.netAmount} /> },
      { header: 'Statut', cell: ({ row }) => <PayoutStatusBadge status={row.original.status} /> },
      {
        header: 'Motif d’échec',
        cell: ({ row }) => row.original.failureReason ?? '—',
      },
      {
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.status === 'PENDING' ? (
              <ApprovePayoutButton payoutId={row.original.id} />
            ) : null}
            {row.original.status === 'PENDING' ||
            row.original.status === 'APPROVED' ||
            row.original.status === 'FAILED' ? (
              <ExecutePayoutDialog payoutId={row.original.id} method={row.original.method} />
            ) : null}
            {row.original.status === 'PENDING' || row.original.status === 'APPROVED' ? (
              <FailPayoutDialog payoutId={row.original.id} />
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  function handleRowSelect(payout: Payout) {
    setSelectedPayoutId(payout.id);
    openContextPanel({
      title: 'Reversement',
      blocks: [
        {
          type: 'identity',
          title: payout.reference,
          subtitle: payout.landlord.displayName,
          badge: { label: PAYOUT_STATUS_LABELS[payout.status], tone: PAYOUT_TONE[payout.status] },
        },
        {
          type: 'metric',
          title: 'Montant',
          value: formatXaf(payout.netAmount),
          label: 'Montant net',
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Bailleur', v: payout.landlord.displayName },
            { k: 'Méthode', v: PAYMENT_METHOD_LABELS[payout.method] },
            { k: 'Montant brut', v: formatXaf(payout.amount) },
            { k: 'Frais', v: formatXaf(payout.feeAmount) },
            {
              k: 'Date de paiement',
              v: payout.paidAt
                ? new Date(payout.paidAt).toLocaleDateString('fr-CG')
                : payout.scheduledDate
                  ? new Date(payout.scheduledDate).toLocaleDateString('fr-CG')
                  : 'Non planifiée',
            },
          ],
        },
        ...(payout.status === 'FAILED' && payout.failureReason
          ? [
              {
                type: 'alert' as const,
                tone: 'danger' as const,
                text: `Échec du reversement : ${payout.failureReason}`,
              },
            ]
          : []),
        {
          type: 'actions',
          actions: [
            payout.statementId
              ? {
                  label: 'Voir la fiche du relevé',
                  primary: true,
                  href: `/app/gerance/releves/${payout.statementId}`,
                }
              : {
                  label: 'Voir la fiche du bailleur',
                  primary: true,
                  href: `/app/bailleurs/${payout.landlord.id}`,
                },
            { label: 'Voir le bailleur', href: `/app/bailleurs/${payout.landlord.id}` },
          ],
        },
      ],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reversements"
        description="Reversements aux bailleurs : approbation, exécution et suivi des échecs."
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres de statut">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={status === item.value ? 'default' : 'outline'}
            onClick={() => setStatus(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun reversement"
        emptyDescription="Un reversement se crée depuis un relevé émis au solde positif."
        onRowSelect={handleRowSelect}
        getRowLabel={(payout) => `Voir le détail du reversement ${payout.reference}`}
        getRowClassName={(payout) =>
          payout.id === selectedPayoutId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
