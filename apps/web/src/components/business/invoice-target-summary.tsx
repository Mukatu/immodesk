'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useInvoice } from '@/lib/api/hooks/use-invoices';

export interface InvoiceTargetSummaryProps {
  invoiceId: string | null;
  className?: string;
}

/**
 * Résumé de la facture visée par une déclaration, affiché à côté de la
 * preuve (mise en page « côte à côte » demandée pour l'instruction d'une
 * déclaration). Aucun composant de résumé de facture réutilisable n'existait
 * dans components/business : celui-ci reprend les champs de `InvoiceDetail`
 * déjà affichés sur l'écran facture (apps/app/factures/[id]).
 */
export function InvoiceTargetSummary({ invoiceId, className }: InvoiceTargetSummaryProps) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);

  if (!invoiceId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Facture visée</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune facture ciblée — l&apos;imputation se fera sur la facture la plus ancienne à la
            validation.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !invoice) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Facture visée</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>
          <Link href={`/app/factures/${invoice.id}`} className="text-primary hover:underline">
            {invoice.invoiceNumber ?? 'Facture'}
          </Link>
        </CardTitle>
        <InvoiceStatusBadge status={invoice.status} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {invoice.tenant.displayName} — {invoice.unit.code}
        </p>
        <p className="text-muted-foreground">
          Période du {new Date(invoice.periodStart).toLocaleDateString('fr-CG')} au{' '}
          {new Date(invoice.periodEnd).toLocaleDateString('fr-CG')}, échéance le{' '}
          {new Date(invoice.dueDate).toLocaleDateString('fr-CG')}
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">
              <MoneyXaf amount={invoice.totalAmount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Réglé</p>
            <p className="font-medium">
              <MoneyXaf amount={invoice.paidAmount} />
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Solde</p>
            <p className="font-medium">
              <MoneyXaf amount={invoice.balanceAmount} colorize />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
