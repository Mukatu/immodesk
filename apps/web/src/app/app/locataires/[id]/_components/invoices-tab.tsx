'use client';

import Link from 'next/link';

import { EmptyState } from '@/components/business/empty-state';
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '@/lib/api/hooks/use-invoices';

export interface InvoicesTabProps {
  tenantId: string;
}

/** Onglet « Factures » de la fiche locataire : sous-liste filtrée par locataire. */
export function InvoicesTab({ tenantId }: InvoicesTabProps) {
  const { data, isLoading } = useInvoices({ tenantId, limit: 50 });
  const items = data?.items ?? [];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (items.length === 0) {
    return (
      <EmptyState title="Aucune facture" description="Ce locataire n'a pas encore de facture." />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((invoice) => (
        <li
          key={invoice.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
        >
          <Link
            href={`/app/factures/${invoice.id}`}
            className="font-medium text-primary hover:underline"
          >
            {invoice.invoiceNumber ?? 'Brouillon'} — {invoice.periodStart.slice(0, 7)}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Solde <MoneyXaf amount={invoice.balanceAmount} />
            </span>
            <MoneyXaf amount={invoice.totalAmount} className="font-medium" />
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
