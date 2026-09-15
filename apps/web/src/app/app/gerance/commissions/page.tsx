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
import { useCommissions } from '@/lib/api/hooks/use-commissions';
import { useMandates } from '@/lib/api/hooks/use-mandates';
import { COMMISSION_STATUS_LABELS } from '@/lib/enum-labels';
import type { Commission } from '@/lib/api/types';

export default function CommissionsPage() {
  const [mandateId, setMandateId] = React.useState('ALL');
  const [period, setPeriod] = React.useState('');

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
      />
    </div>
  );
}
