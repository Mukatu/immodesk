'use client';

import { useParams } from 'next/navigation';
import { FileWarning } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useTenantInvoice } from '@/lib/api/hooks/use-tenant-portal';
import { PayInvoicePanel } from './_components/pay-invoice-panel';
import { ReceiptDownloadButton } from './_components/receipt-download-button';

function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function FactureLocatairePage() {
  const params = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError } = useTenantInvoice(params.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Facture introuvable"
        description="Cette facture n'existe pas ou ne fait pas partie de vos baux actifs."
      />
    );
  }

  const receiptId = invoice.receipt?.id ?? null;
  const isPaid = invoice.status === 'PAID';
  const canPay = !isPaid && invoice.status !== 'CANCELLED' && invoice.balanceAmount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {invoice.invoiceNumber ?? 'Facture'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.property.name} — Lot {invoice.unit.code}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Période</span>
            <span>
              {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
            </span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Échéance</span>
            <span>{formatDate(invoice.dueDate)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Loyer</span>
            <MoneyXaf amount={invoice.rentAmount} />
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">Charges</span>
            <MoneyXaf amount={invoice.chargesAmount} />
          </p>
          {invoice.penaltyAmount > 0 ? (
            <p className="flex justify-between">
              <span className="text-muted-foreground">Pénalités</span>
              <MoneyXaf amount={invoice.penaltyAmount} />
            </p>
          ) : null}
          <p className="flex justify-between">
            <span className="text-muted-foreground">Déjà réglé</span>
            <MoneyXaf amount={invoice.paidAmount} />
          </p>
          <p className="flex justify-between text-base font-semibold">
            <span>Solde dû</span>
            <MoneyXaf amount={invoice.balanceAmount} colorize />
          </p>
        </CardContent>
      </Card>

      {canPay ? <PayInvoicePanel invoiceId={invoice.id} /> : null}

      {isPaid ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quittance</CardTitle>
          </CardHeader>
          <CardContent>
            {receiptId ? (
              <ReceiptDownloadButton receiptId={receiptId} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Quittance non disponible pour le moment.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
