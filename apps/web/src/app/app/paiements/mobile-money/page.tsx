'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { EnumSelect } from '@/components/business/enum-select';
import { MomoStatusBadge } from '@/components/business/momo-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { OperatorBadge } from '@/components/business/operator-badge';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMomoTransactions } from '@/lib/api/hooks/use-mobile-money-transactions';
import { MOMO_CHANNEL_LABELS, MOMO_STATUS_LABELS } from '@/lib/enum-labels';
import type { MomoChannel, MomoStatus, MomoTransaction } from '@/lib/api/types';
import { RefreshMomoButton } from './_components/refresh-momo-button';

const PAGE_SIZE = 20;
const REFRESHABLE_STATUSES: MomoStatus[] = ['INITIATED', 'PENDING'];

/** Journal des transactions Mobile Money, agrégateur et déclarées confondues. */
export default function MobileMoneyJournalPage() {
  const [channel, setChannel] = React.useState<MomoChannel | ''>('');
  const [status, setStatus] = React.useState<MomoStatus | ''>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data, isLoading } = useMomoTransactions({
    channel: channel || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  const transactions = data?.items ?? [];

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

  const columns = React.useMemo<ColumnDef<MomoTransaction>[]>(
    () => [
      {
        header: 'Canal',
        cell: ({ row }) => (
          <Badge variant="outline">{MOMO_CHANNEL_LABELS[row.original.channel]}</Badge>
        ),
      },
      { header: 'Statut', cell: ({ row }) => <MomoStatusBadge status={row.original.status} /> },
      {
        header: 'Opérateur',
        cell: ({ row }) => <OperatorBadge msisdn={row.original.payerMsisdn} />,
      },
      { header: 'Référence', cell: ({ row }) => row.original.merchantReference },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      { header: 'Frais', cell: ({ row }) => <MoneyXaf amount={row.original.feeAmount} /> },
      { header: 'Net', cell: ({ row }) => <MoneyXaf amount={row.original.netAmount} /> },
      {
        header: 'Date',
        cell: ({ row }) => new Date(row.original.initiatedAt).toLocaleString('fr-CG'),
      },
      {
        header: '',
        cell: ({ row }) =>
          row.original.channel === 'AGGREGATOR' &&
          REFRESHABLE_STATUSES.includes(row.original.status) ? (
            <RefreshMomoButton transactionId={row.original.id} />
          ) : null,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Mobile Money"
        description="Transactions agrégateur et déclarées, toutes confondues."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1">
          <label htmlFor="channel-filter" className="text-xs font-medium text-muted-foreground">
            Canal
          </label>
          <EnumSelect<MomoChannel>
            id="channel-filter"
            value={channel}
            onValueChange={(v) => {
              setChannel(v);
              resetPagination();
            }}
            labels={MOMO_CHANNEL_LABELS}
            placeholder="Tous les canaux"
          />
        </div>

        <div className="w-52 space-y-1">
          <label htmlFor="momo-status-filter" className="text-xs font-medium text-muted-foreground">
            Statut
          </label>
          <EnumSelect<MomoStatus>
            id="momo-status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={MOMO_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="w-40 space-y-1">
          <label htmlFor="from-filter" className="text-xs font-medium text-muted-foreground">
            Du
          </label>
          <Input
            id="from-filter"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPagination();
            }}
          />
        </div>

        <div className="w-40 space-y-1">
          <label htmlFor="to-filter" className="text-xs font-medium text-muted-foreground">
            Au
          </label>
          <Input
            id="to-filter"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              resetPagination();
            }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        isLoading={isLoading}
        emptyTitle="Aucune transaction"
        emptyDescription="Les transactions Mobile Money apparaissent ici une fois initiées ou déclarées."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
