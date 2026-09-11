'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { useInvoice, useInvoicePdf, useIssueInvoice } from '@/lib/api/hooks/use-invoices';
import { INVOICE_LINE_TYPE_LABELS } from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/client';
import { CancelInvoiceDialog } from './_components/cancel-invoice-dialog';

export default function FactureDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: invoice, isLoading, error } = useInvoice(id);
  const issueInvoice = useIssueInvoice(id);
  const invoicePdf = useInvoicePdf(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Facture introuvable"
        description="Cette facture n'existe pas ou a été supprimée."
        action={
          <Button asChild variant="outline">
            <Link href="/app/factures">Retour à la liste des factures</Link>
          </Button>
        }
      />
    );
  }

  if (error || !invoice) {
    return (
      <EmptyState
        title="Impossible de charger cette facture"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  async function handleIssue() {
    try {
      await issueInvoice.mutateAsync();
      toast.success('Facture émise.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'émettre la facture.");
    }
  }

  async function handlePdf() {
    try {
      const result = await invoicePdf.mutateAsync();
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de générer le PDF.');
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/app/factures"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux factures
      </Link>

      <PageHeader
        title={invoice.invoiceNumber ?? 'Facture brouillon'}
        description={`${invoice.tenant.displayName} — ${invoice.property.name} (${invoice.unit.code})`}
        actions={
          <div className="flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            <Button
              type="button"
              variant="outline"
              onClick={handlePdf}
              disabled={invoicePdf.isPending}
            >
              PDF
            </Button>
            {invoice.status === 'DRAFT' ? (
              <Button type="button" onClick={handleIssue} disabled={issueInvoice.isPending}>
                {issueInvoice.isPending ? 'Émission…' : 'Émettre'}
              </Button>
            ) : null}
            {invoice.paidAmount === 0 && invoice.status !== 'CANCELLED' ? (
              <CancelInvoiceDialog invoiceId={invoice.id} />
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label="Loyer" amount={invoice.rentAmount} />
        <SummaryTile label="Charges" amount={invoice.chargesAmount} />
        <SummaryTile label="Pénalités" amount={invoice.penaltyAmount} />
        <SummaryTile label="Autres" amount={invoice.otherAmount} />
        <SummaryTile label="Remise" amount={invoice.discountAmount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Total" amount={invoice.totalAmount} emphasize />
        <SummaryTile label="Payé" amount={invoice.paidAmount} colorize />
        <SummaryTile label="Solde restant" amount={invoice.balanceAmount} emphasize />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lignes de facture</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{INVOICE_LINE_TYPE_LABELS[line.lineType]}</TableCell>
                  <TableCell>{line.label}</TableCell>
                  <TableCell>
                    <MoneyXaf amount={line.amount} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements affectés</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun paiement affecté pour l&apos;instant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    <TableCell>{allocation.allocationDate}</TableCell>
                    <TableCell>
                      <Link
                        href={`/app/paiements/${allocation.paymentId}`}
                        className="text-primary hover:underline"
                      >
                        {allocation.paymentReference}
                      </Link>
                      {allocation.isReversal ? (
                        <Badge variant="outline" className="ml-2">
                          Contre-passation
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{allocation.method}</TableCell>
                    <TableCell>
                      <MoneyXaf amount={allocation.amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quittance</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.receipt ? (
            <Link
              href={`/app/quittances/${invoice.receipt.id}`}
              className="text-primary hover:underline"
            >
              {invoice.receipt.receiptNumber}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Générée automatiquement au règlement complet de la facture.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Émise le : {invoice.issuedAt ?? '—'}</p>
          <p>Échéance : {invoice.dueDate}</p>
          <p>Grâce jusqu&apos;au : {invoice.graceUntilDate ?? '—'}</p>
          <p>Payée le : {invoice.paidAt ?? '—'}</p>
          {invoice.cancelledAt ? (
            <p>
              Annulée le {invoice.cancelledAt} — motif : {invoice.cancellationReason}
            </p>
          ) : null}
          {invoice.notes ? <p>Notes : {invoice.notes}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  amount,
  emphasize,
  colorize,
}: {
  label: string;
  amount: number;
  emphasize?: boolean;
  colorize?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className={emphasize ? 'text-xl font-semibold' : 'text-base'}>
          <MoneyXaf amount={amount} colorize={colorize} />
        </p>
      </CardContent>
    </Card>
  );
}
