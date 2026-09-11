'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyXaf } from '@/components/business/money-xaf';
import {
  useCashReceipts,
  useCashReceiptPdf,
  useSendCashReceipt,
} from '@/lib/api/hooks/use-cash-receipts';
import { CASH_RECEIPT_STATUS_LABELS } from '@/lib/enum-labels';
import type { CashReceiptStatus, CashReceiptSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

function ReceiptActions({ receiptId }: { receiptId: string }) {
  const pdf = useCashReceiptPdf(receiptId);
  const send = useSendCashReceipt(receiptId);

  async function handlePdf() {
    try {
      const result = await pdf.mutateAsync();
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de générer le PDF.');
    }
  }

  async function handleSend() {
    try {
      await send.mutateAsync({});
      toast.success('Reçu renvoyé au locataire.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de renvoyer le reçu.');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handlePdf}
        disabled={pdf.isPending}
      >
        PDF
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleSend}
        disabled={send.isPending}
      >
        Renvoyer
      </Button>
    </div>
  );
}

export default function RecusCaissePage() {
  const [status, setStatus] = React.useState<CashReceiptStatus | ''>('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data, isLoading } = useCashReceipts({
    status: status || undefined,
    cursor,
    limit: PAGE_SIZE,
  });
  const receipts = data?.items ?? [];

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

  const columns = React.useMemo<ColumnDef<CashReceiptSummary>[]>(
    () => [
      {
        header: 'Numéro',
        cell: ({ row }) => <span className="font-medium">{row.original.receiptNumber}</span>,
      },
      { header: 'Locataire', cell: ({ row }) => row.original.tenant.displayName },
      { header: 'Démarcheur', cell: ({ row }) => row.original.collectorName },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      {
        header: 'Statut',
        cell: ({ row }) => (
          <Badge variant="outline">{CASH_RECEIPT_STATUS_LABELS[row.original.status]}</Badge>
        ),
      },
      {
        header: 'Reçu le',
        cell: ({ row }) => new Date(row.original.receivedAt).toLocaleString('fr-CG'),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => <ReceiptActions receiptId={row.original.id} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reçus de caisse"
        description="Historique des encaissements en espèces au comptoir."
      />

      <div className="w-56 space-y-1">
        <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
          Statut
        </label>
        <EnumSelect<CashReceiptStatus>
          id="status-filter"
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            resetPagination();
          }}
          labels={CASH_RECEIPT_STATUS_LABELS}
          placeholder="Tous les statuts"
        />
      </div>

      <DataTable
        columns={columns}
        data={receipts}
        isLoading={isLoading}
        emptyTitle="Aucun reçu"
        emptyDescription="Les reçus apparaissent ici après un encaissement en espèces."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
