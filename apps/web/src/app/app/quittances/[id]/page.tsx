'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Badge, type BadgeProps } from '@/components/ui/badge';
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
import { MessageStatusBadge } from '@/components/business/message-status-badge';
import { useReceipt, useReceiptPdf, useSendReceipt } from '@/lib/api/hooks/use-receipts';
import { RECEIPT_STATUS_LABELS, NOTIFICATION_CHANNEL_LABELS } from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/client';
import type { ReceiptStatus } from '@/lib/api/types';

const RECEIPT_STATUS_VARIANT: Record<ReceiptStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  GENERATING: 'warning',
  ISSUED: 'secondary',
  SENT: 'success',
  CANCELLED: 'outline',
};

export default function QuittanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: receipt, isLoading, error } = useReceipt(id);
  const receiptPdf = useReceiptPdf(id);
  const sendReceipt = useSendReceipt(id);

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
        title="Quittance introuvable"
        description="Cette quittance n'existe pas ou a été supprimée."
        action={
          <Button asChild variant="outline">
            <Link href="/app/quittances">Retour à la liste des quittances</Link>
          </Button>
        }
      />
    );
  }

  if (error || !receipt) {
    return (
      <EmptyState
        title="Impossible de charger cette quittance"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  async function handlePdf() {
    try {
      const result = await receiptPdf.mutateAsync();
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de générer le PDF.');
    }
  }

  async function handleSend() {
    try {
      await sendReceipt.mutateAsync({});
      toast.success('Quittance renvoyée au locataire.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de renvoyer la quittance.');
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/app/quittances"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux quittances
      </Link>

      <PageHeader
        title={receipt.receiptNumber}
        description={`${receipt.tenant.displayName} — ${receipt.periodStart?.slice(0, 7) ?? ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={RECEIPT_STATUS_VARIANT[receipt.status]}>
              {RECEIPT_STATUS_LABELS[receipt.status]}
            </Badge>
            <Button
              type="button"
              variant="outline"
              onClick={handlePdf}
              disabled={receiptPdf.isPending}
            >
              PDF
            </Button>
            <Button type="button" onClick={handleSend} disabled={sendReceipt.isPending}>
              {sendReceipt.isPending ? 'Envoi…' : 'Renvoyer'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label="Loyer" amount={receipt.rentAmount} />
        <SummaryTile label="Charges" amount={receipt.chargesAmount} />
        <SummaryTile label="Pénalités" amount={receipt.penaltyAmount} />
        <SummaryTile label="Total" amount={receipt.totalAmount} emphasize />
        <SummaryTile label="Solde restant du locataire" amount={receipt.remainingBalanceAmount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statut d&apos;envoi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Canal : {receipt.sentChannel ? NOTIFICATION_CHANNEL_LABELS[receipt.sentChannel] : '—'}
          </p>
          <p>Envoyée le : {receipt.sentAt ?? '—'}</p>
          <p>
            Lien de vérification publique :{' '}
            <span className="font-mono text-xs">{receipt.verificationUrl}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des messages</CardTitle>
        </CardHeader>
        <CardContent>
          {receipt.messageLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun message envoyé pour cette quittance.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.messageLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.queuedAt}</TableCell>
                    <TableCell>{NOTIFICATION_CHANNEL_LABELS[log.channel]}</TableCell>
                    <TableCell>
                      <MessageStatusBadge status={log.status} />
                    </TableCell>
                    <TableCell>{log.errorMessage ?? '—'}</TableCell>
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

function SummaryTile({
  label,
  amount,
  emphasize,
}: {
  label: string;
  amount: number;
  emphasize?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className={emphasize ? 'text-xl font-semibold' : 'text-base'}>
          <MoneyXaf amount={amount} />
        </p>
      </CardContent>
    </Card>
  );
}
