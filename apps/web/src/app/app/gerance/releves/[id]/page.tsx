'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { EmptyState } from '@/components/business/empty-state';
import { StatementStatusBadge } from '@/components/business/statement-status-badge';
import { StatementLinesTable } from '@/components/business/statement-lines-table';
import { PayoutStatusBadge } from '@/components/business/payout-status-badge';
import {
  useIssueOwnerStatement,
  useOwnerStatement,
  useOwnerStatementPdf,
} from '@/lib/api/hooks/use-owner-statements';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { CancelStatementDialog } from './_components/cancel-statement-dialog';
import { CreatePayoutButton } from '../../reversements/_components/create-payout-button';
import { ExecutePayoutDialog } from '../../reversements/_components/execute-payout-dialog';
import { ApprovePayoutButton } from '../../reversements/_components/approve-payout-button';
import { FailPayoutDialog } from '../../reversements/_components/fail-payout-dialog';

export default function RelevesDetailPage() {
  const params = useParams<{ id: string }>();
  const statementId = params.id;
  const { data: statement, isLoading } = useOwnerStatement(statementId);
  const issueStatement = useIssueOwnerStatement(statementId);
  const fetchPdf = useOwnerStatementPdf(statementId);
  const [error, setError] = React.useState<string | null>(null);

  async function handleIssue() {
    setError(null);
    try {
      await issueStatement.mutateAsync();
      toast.success('Relevé émis. PDF en cours de génération, envoi déclenché au bailleur.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleDownloadPdf() {
    try {
      const result = await fetchPdf.mutateAsync();
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!statement) {
    return <EmptyState title="Relevé introuvable" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={statement.statementNumber}
        description={`${statement.landlord.displayName} — ${statement.property?.name ?? 'Relevé consolidé'} — période ${statement.periodStart.slice(0, 7)}`}
        actions={<StatementStatusBadge status={statement.status} />}
      />

      <div className="flex flex-wrap gap-2">
        {statement.status === 'DRAFT' ? (
          <Button type="button" onClick={handleIssue} disabled={issueStatement.isPending}>
            {issueStatement.isPending ? 'Émission…' : 'Émettre le relevé'}
          </Button>
        ) : null}
        {statement.documentId ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={fetchPdf.isPending}
          >
            Télécharger le PDF
          </Button>
        ) : null}
        {(statement.status === 'DRAFT' || statement.status === 'ISSUED') && (
          <CancelStatementDialog statementId={statement.id} />
        )}
      </div>
      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Loyers encaissés</p>
          <p className="font-medium">
            <MoneyXaf amount={statement.rentCollectedAmount} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Commission + TVA</p>
          <p className="font-medium">
            <MoneyXaf amount={statement.commissionAmount + statement.commissionVatAmount} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dépenses</p>
          <p className="font-medium">
            <MoneyXaf amount={statement.expensesAmount} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Solde net</p>
          <p className="text-lg font-semibold">
            <MoneyXaf amount={statement.netPayableAmount} colorize />
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lignes du relevé</CardTitle>
        </CardHeader>
        <CardContent>
          <StatementLinesTable lines={statement.lines} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reversement</CardTitle>
        </CardHeader>
        <CardContent>
          {statement.payout ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{statement.payout.reference}</span>
                <PayoutStatusBadge status={statement.payout.status} />
                <MoneyXaf amount={statement.payout.netAmount} />
              </div>
              {statement.payout.failureReason ? (
                <p className="text-sm text-destructive">Échec : {statement.payout.failureReason}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {statement.payout.status === 'PENDING' ? (
                  <ApprovePayoutButton payoutId={statement.payout.id} />
                ) : null}
                {statement.payout.status === 'PENDING' ||
                statement.payout.status === 'APPROVED' ||
                statement.payout.status === 'FAILED' ? (
                  <ExecutePayoutDialog
                    payoutId={statement.payout.id}
                    method={statement.payout.method}
                  />
                ) : null}
                {statement.payout.status === 'PENDING' || statement.payout.status === 'APPROVED' ? (
                  <FailPayoutDialog payoutId={statement.payout.id} />
                ) : null}
              </div>
            </div>
          ) : statement.status === 'ISSUED' || statement.status === 'SENT' ? (
            <CreatePayoutButton
              statementId={statement.id}
              netPayableAmount={statement.netPayableAmount}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Le relevé doit être émis avant tout reversement.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
