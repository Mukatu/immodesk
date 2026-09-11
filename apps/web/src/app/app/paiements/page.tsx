'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PaymentStatusBadge } from '@/components/business/payment-status-badge';
import { EnumSelect } from '@/components/business/enum-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePayments } from '@/lib/api/hooks/use-payments';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/enum-labels';
import type { PaymentMethod, PaymentStatus, PaymentSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

export default function PaiementsPage() {
  const [method, setMethod] = React.useState<PaymentMethod | ''>('');
  const [status, setStatus] = React.useState<PaymentStatus | ''>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data, isLoading } = usePayments({
    method: method || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  const payments = data?.items ?? [];

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

  const columns = React.useMemo<ColumnDef<PaymentSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/paiements/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      { header: 'Locataire', cell: ({ row }) => row.original.tenant?.displayName ?? '—' },
      { header: 'Méthode', cell: ({ row }) => PAYMENT_METHOD_LABELS[row.original.method] },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      {
        header: 'Alloué',
        cell: ({ row }) => <MoneyXaf amount={row.original.allocatedAmount} colorize />,
      },
      { header: 'Statut', cell: ({ row }) => <PaymentStatusBadge status={row.original.status} /> },
      { header: 'Date', cell: ({ row }) => row.original.paymentDate },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Suivez les encaissements et leur affectation aux factures."
        actions={
          <Button asChild>
            <Link href="/app/paiements/nouveau">Saisir un paiement</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1">
          <label htmlFor="method-filter" className="text-xs font-medium text-muted-foreground">
            Méthode
          </label>
          <EnumSelect<PaymentMethod>
            id="method-filter"
            value={method}
            onValueChange={(v) => {
              setMethod(v);
              resetPagination();
            }}
            labels={PAYMENT_METHOD_LABELS}
            placeholder="Toutes les méthodes"
          />
        </div>

        <div className="w-52 space-y-1">
          <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
            Statut
          </label>
          <EnumSelect<PaymentStatus>
            id="status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={PAYMENT_STATUS_LABELS}
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
        data={payments}
        isLoading={isLoading}
        emptyTitle="Aucun paiement"
        emptyDescription="Les paiements apparaissent ici une fois saisis au comptoir ou déclarés."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
