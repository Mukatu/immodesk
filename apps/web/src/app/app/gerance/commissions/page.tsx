'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { CommissionSummaryCard } from '@/components/business/commission-summary-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useCommissions } from '@/lib/api/hooks/use-commissions';
import { useMandates } from '@/lib/api/hooks/use-mandates';
import { COMMISSION_BASIS_LABELS, COMMISSION_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { Commission, CommissionStatus } from '@/lib/api/types';

/**
 * Statuts de commission de GÉRANCE (5 valeurs, contrat phase 7) — à ne pas confondre
 * avec `ReferralCommissionStatus` (apport d'affaires, phase 10) qui n'a rien à voir
 * avec cet écran.
 */
const COMMISSION_TONE: Record<CommissionStatus, ContextPanelTone> = {
  PENDING: 'neutral',
  ACCRUED: 'info',
  INVOICED: 'info',
  SETTLED: 'ok',
  CANCELLED: 'danger',
};

export default function CommissionsPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedCommissionId, setSelectedCommissionId] = React.useState<string | null>(null);
  const [mandateId, setMandateId] = React.useState('ALL');
  const [period, setPeriod] = React.useState('');

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedCommissionId(null);
  }, [isContextPanelOpen]);

  const { data: mandates } = useMandates({ limit: 100 });
  const { data } = useCommissions({
    mandateId: mandateId === 'ALL' ? undefined : mandateId,
    period: period || undefined,
  });

  const columns = React.useMemo<ColumnDef<Commission>[]>(
    () => [
      { header: 'Bailleur', cell: ({ row }) => row.original.landlord.displayName },
      { header: 'Période', cell: ({ row }) => row.original.periodStart.slice(0, 7) },
      { header: 'Base', cell: ({ row }) => <MoneyXaf amount={row.original.baseAmount} /> },
      {
        header: 'Taux',
        cell: ({ row }) =>
          row.original.rateBps !== null
            ? `${(row.original.rateBps / 100).toLocaleString('fr-FR')} %`
            : '—',
      },
      { header: 'Commission', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      { header: 'TVA', cell: ({ row }) => <MoneyXaf amount={row.original.vatAmount} /> },
      { header: 'Total', cell: ({ row }) => <MoneyXaf amount={row.original.totalAmount} /> },
      { header: 'Statut', cell: ({ row }) => COMMISSION_STATUS_LABELS[row.original.status] },
    ],
    [],
  );

  function handleRowSelect(commission: Commission) {
    setSelectedCommissionId(commission.id);
    openContextPanel({
      title: 'Commission de gestion',
      blocks: [
        {
          type: 'identity',
          title: `Commission — ${commission.landlord.displayName}`,
          subtitle: `Période ${commission.periodStart.slice(0, 7)}`,
          badge: {
            label: COMMISSION_STATUS_LABELS[commission.status],
            tone: COMMISSION_TONE[commission.status],
          },
        },
        {
          type: 'metric',
          title: 'Montant',
          value: formatXaf(commission.totalAmount),
          label: 'Total TTC',
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Bailleur', v: commission.landlord.displayName },
            { k: 'Base de calcul', v: COMMISSION_BASIS_LABELS[commission.basis] },
            {
              k: 'Taux',
              v:
                commission.rateBps !== null
                  ? `${(commission.rateBps / 100).toLocaleString('fr-FR')} %`
                  : '—',
            },
            { k: 'Montant de base', v: formatXaf(commission.baseAmount) },
            { k: 'TVA', v: formatXaf(commission.vatAmount) },
          ],
        },
        {
          type: 'actions',
          actions: [
            commission.mandateId
              ? {
                  label: 'Voir la fiche du mandat',
                  primary: true,
                  href: `/app/gerance/mandats/${commission.mandateId}`,
                }
              : {
                  label: 'Voir la fiche du bailleur',
                  primary: true,
                  href: `/app/bailleurs/${commission.landlord.id}`,
                },
            { label: 'Voir le bailleur', href: `/app/bailleurs/${commission.landlord.id}` },
            ...(commission.ownerStatementId
              ? [
                  {
                    label: 'Voir le relevé de gérance',
                    href: `/app/gerance/releves/${commission.ownerStatementId}`,
                  },
                ]
              : []),
          ],
        },
      ],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Cumul des commissions de gestion par mandat et par période."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="commission-mandate">Mandat</Label>
          <Select value={mandateId} onValueChange={setMandateId}>
            <SelectTrigger id="commission-mandate" className="w-64">
              <SelectValue placeholder="Tous les mandats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les mandats</SelectItem>
              {(mandates?.items ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.reference} — {m.landlord.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="commission-period">Période</Label>
          <Input
            id="commission-period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>

      {data ? (
        <CommissionSummaryCard
          title={
            mandateId === 'ALL'
              ? 'Cumul toutes commissions'
              : `Cumul — ${mandates?.items.find((m) => m.id === mandateId)?.reference ?? ''}`
          }
          description={period ? `Période ${period}` : 'Toutes périodes confondues'}
          totals={data.totals}
        />
      ) : null}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        emptyTitle="Aucune commission"
        emptyDescription="Les commissions apparaissent après une campagne de relevés."
        onRowSelect={handleRowSelect}
        getRowLabel={(commission) =>
          `Voir le détail de la commission de ${commission.landlord.displayName}`
        }
        getRowClassName={(commission) =>
          commission.id === selectedCommissionId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
