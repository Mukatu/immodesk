'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EnumSelect } from '@/components/business/enum-select';
import { PeriodPicker, currentPeriod } from '@/components/business/period-picker';
import { useReceipts } from '@/lib/api/hooks/use-receipts';
import { RECEIPT_STATUS_LABELS, NOTIFICATION_CHANNEL_LABELS } from '@/lib/enum-labels';
import type { ReceiptStatus, ReceiptSummary } from '@/lib/api/types';

const RECEIPT_STATUS_VARIANT: Record<ReceiptStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  GENERATING: 'warning',
  ISSUED: 'secondary',
  SENT: 'success',
  CANCELLED: 'outline',
};

const PAGE_SIZE = 20;

export default function QuittancesPage() {
  const [status, setStatus] = React.useState<ReceiptStatus | ''>('');
  const [period, setPeriod] = React.useState(currentPeriod());
  const [periodEnabled, setPeriodEnabled] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data, isLoading } = useReceipts({
    status: status || undefined,
    period: periodEnabled ? period : undefined,
    cursor,
    limit: PAGE_SIZE,
  });
  const receiptsList = data?.items ?? [];

  function resetPagination() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const columns = React.useMemo<ColumnDef<ReceiptSummary>[]>(
    () => [
      {
        header: 'Numéro',
        cell: ({ row }) => (
          <Link
            href={`/app/quittances/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.receiptNumber}
          </Link>
        ),
      },
      { header: 'Locataire', cell: ({ row }) => row.original.tenant.displayName },
      { header: 'Période', cell: ({ row }) => row.original.periodStart?.slice(0, 7) ?? '—' },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.totalAmount} /> },
      {
        header: 'Statut',
        cell: ({ row }) => (
          <Badge variant={RECEIPT_STATUS_VARIANT[row.original.status]}>
            {RECEIPT_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        header: 'Envoi',
        cell: ({ row }) =>
          row.original.sentChannel
            ? NOTIFICATION_CHANNEL_LABELS[row.original.sentChannel]
            : 'Non envoyée',
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quittances"
        description="Quittances générées automatiquement au règlement complet."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1">
          <label
            htmlFor="receipt-status-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Statut
          </label>
          <EnumSelect<ReceiptStatus>
            id="receipt-status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={RECEIPT_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={periodEnabled}
              onChange={(e) => {
                setPeriodEnabled(e.target.checked);
                resetPagination();
              }}
            />
            Filtrer par période
          </label>
          {periodEnabled ? (
            <PeriodPicker
              value={period}
              onValueChange={(v) => {
                setPeriod(v);
                resetPagination();
              }}
            />
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={receiptsList}
        isLoading={isLoading}
        emptyTitle="Aucune quittance"
        emptyDescription="Les quittances apparaissent ici dès qu'une facture est réglée en totalité."
        pageInfo={data?.pageInfo}
        onNextPage={() => {
          if (data?.pageInfo.nextCursor) {
            setPreviousCursors((prev) => [...prev, cursor ?? '']);
            setCursor(data.pageInfo.nextCursor);
          }
        }}
        onPreviousPage={() => {
          setPreviousCursors((prev) => {
            const next = [...prev];
            const last = next.pop();
            setCursor(last || undefined);
            return next;
          });
        }}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
