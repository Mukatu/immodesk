'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PaymentStatusBadge } from '@/components/business/payment-status-badge';
import { usePayment, useConfirmPayment } from '@/lib/api/hooks/use-payments';
import { PAYMENT_METHOD_LABELS } from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/client';
import { RejectPaymentDialog } from './_components/reject-payment-dialog';
import { ReversePaymentDialog } from './_components/reverse-payment-dialog';

export default function PaiementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: payment, isLoading, error } = usePayment(id);
  const confirmPayment = useConfirmPayment(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Paiement introuvable"
        description="Ce paiement n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/paiements">Retour aux paiements</Link>
          </Button>
        }
      />
    );
  }

  if (error || !payment) {
    return (
      <EmptyState
        title="Impossible de charger ce paiement"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  async function handleConfirm() {
    try {
      await confirmPayment.mutateAsync({});
      toast.success('Paiement confirmé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de confirmer le paiement.');
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/app/paiements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux paiements
      </Link>

      <PageHeader
        title={payment.reference}
        description={`${PAYMENT_METHOD_LABELS[payment.method]} — ${payment.paymentDate}`}
        actions={
          <div className="flex items-center gap-2">
            <PaymentStatusBadge status={payment.status} />
            {payment.status === 'PENDING_VERIFICATION' ? (
              <>
                <Button type="button" disabled={confirmPayment.isPending} onClick={handleConfirm}>
                  {confirmPayment.isPending ? 'Confirmation…' : 'Confirmer'}
                </Button>
                <RejectPaymentDialog paymentId={payment.id} />
              </>
            ) : null}
            {payment.status === 'CONFIRMED' && !payment.reversedAt ? (
              <ReversePaymentDialog paymentId={payment.id} />
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Détails</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Locataire</p>
            <p className="font-medium">{payment.tenant?.displayName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Montant</p>
            <p className="font-medium">
              <MoneyXaf amount={payment.amount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Alloué</p>
            <p className="font-medium">
              <MoneyXaf amount={payment.allocatedAmount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Non affecté</p>
            <p className="font-medium">
              <MoneyXaf amount={payment.unallocatedAmount} />
            </p>
          </div>
          {payment.externalReference ? (
            <div>
              <p className="text-xs text-muted-foreground">Référence externe</p>
              <p className="font-medium">{payment.externalReference}</p>
            </div>
          ) : null}
          {payment.rejectionReason ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Motif de rejet</p>
              <p className="font-medium">{payment.rejectionReason}</p>
            </div>
          ) : null}
          {payment.reversalReason ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Motif de contre-passation</p>
              <p className="font-medium">{payment.reversalReason}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affectations</CardTitle>
        </CardHeader>
        <CardContent>
          {payment.allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune affectation pour ce paiement.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>
                      {allocation.invoiceId ? (
                        <Link
                          href={`/app/factures/${allocation.invoiceId}`}
                          className="text-primary hover:underline"
                        >
                          {allocation.invoiceNumber ?? allocation.invoiceId}
                        </Link>
                      ) : (
                        'Crédit locataire'
                      )}
                    </TableCell>
                    <TableCell>
                      <MoneyXaf amount={allocation.amount} />
                    </TableCell>
                    <TableCell>
                      {allocation.isReversal ? 'Contre-passation' : 'Affectation'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
