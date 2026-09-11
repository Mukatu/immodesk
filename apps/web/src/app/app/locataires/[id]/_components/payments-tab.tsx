'use client';

import Link from 'next/link';

import { EmptyState } from '@/components/business/empty-state';
import { PaymentStatusBadge } from '@/components/business/payment-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayments } from '@/lib/api/hooks/use-payments';
import { PAYMENT_METHOD_LABELS } from '@/lib/enum-labels';

export interface PaymentsTabProps {
  tenantId: string;
}

/** Onglet « Paiements » de la fiche locataire : sous-liste filtrée par locataire. */
export function PaymentsTab({ tenantId }: PaymentsTabProps) {
  const { data, isLoading } = usePayments({ tenantId, limit: 50 });
  const items = data?.items ?? [];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (items.length === 0) {
    return (
      <EmptyState title="Aucun paiement" description="Ce locataire n'a pas encore de paiement." />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((payment) => (
        <li
          key={payment.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
        >
          <Link
            href={`/app/paiements/${payment.id}`}
            className="font-medium text-primary hover:underline"
          >
            {payment.reference} — {PAYMENT_METHOD_LABELS[payment.method]}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{payment.paymentDate}</span>
            <MoneyXaf amount={payment.amount} className="font-medium" />
            <PaymentStatusBadge status={payment.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
