'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { DataTable } from '@/components/business/data-table';
import { MoneyXaf } from '@/components/business/money-xaf';
import { LineStateBadge } from '@/components/business/line-state-badge';
import { useBankAccounts } from '@/lib/api/hooks/use-bank-accounts';
import { useBankStatement, useDiscardBankStatement } from '@/lib/api/hooks/use-bank-statements';
import { useBankStatementLines } from '@/lib/api/hooks/use-bank-statements';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { LINE_STATE_LABELS } from '@/lib/enum-labels';
import type { LineState, StatementLine } from '@/lib/api/types';

const PAGE_SIZE = 20;
const ALL_STATES = 'ALL';

function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Message plus explicite que le code brut pour le refus d'abandon d'un relevé rapproché. */
function discardErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'BANK.STATEMENT_HAS_MATCHES') {
      return "Impossible d'abandonner cet import : au moins une ligne est déjà rapprochée de façon confirmée. Annulez d'abord ces rapprochements.";
    }
    return err.message || genericErrorMessage;
  }
  return genericErrorMessage;
}

function DiscardStatementDialog({
  statementId,
  matchedLinesCount,
}: {
  statementId: string;
  matchedLinesCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const discardStatement = useDiscardBankStatement();

  async function handleConfirm() {
    setError(null);
    try {
      await discardStatement.mutateAsync(statementId);
      toast.success('Import abandonné : les lignes ont été marquées comme ignorées.');
      setOpen(false);
    } catch (err) {
      setError(discardErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Abandonner l&apos;import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abandonner cet import de relevé</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cette action marque toutes les lignes du relevé comme ignorées. Elle ne supprime rien et
          n&apos;est possible que si aucune ligne n&apos;est rapprochée de façon confirmée.
          {matchedLinesCount > 0
            ? ` Attention : ${matchedLinesCount} ligne(s) semblent déjà rapprochée(s) — l'abandon sera probablement refusé.`
            : ''}
        </p>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={discardStatement.isPending}
          >
            {discardStatement.isPending ? 'Abandon en cours…' : "Confirmer l'abandon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RelevesBancaireDetailPage() {
  const params = useParams<{ id: string }>();
  const statementId = params.id;
  const [stateFilter, setStateFilter] = React.useState<LineState | typeof ALL_STATES>(ALL_STATES);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);

  const statementQuery = useBankStatement(statementId);
  const linesQuery = useBankStatementLines(statementId, {
    state: stateFilter === ALL_STATES ? undefined : stateFilter,
    limit: PAGE_SIZE,
    cursor,
  });
  const accountsQuery = useBankAccounts({ holderType: 'ORGANIZATION' });

  const statement = statementQuery.data;
  const accountLabel = accountsQuery.data?.items.find(
    (a) => a.id === statement?.bankAccountId,
  )?.label;

  const columns = React.useMemo<ColumnDef<StatementLine>[]>(
    () => [
      { header: 'Date', cell: ({ row }) => formatDateFr(row.original.operationDate) },
      { header: 'Libellé', accessorKey: 'label' },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      { header: 'État', cell: ({ row }) => <LineStateBadge state={row.original.state} /> },
    ],
    [],
  );

  if (statementQuery.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!statement) {
    return (
      <EmptyState
        title="Relevé introuvable"
        description="Ce relevé n'existe pas ou a été supprimé."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/app/banque/releves">
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Retour aux relevés
        </Link>
      </Button>

      <PageHeader
        title={`Relevé ${formatDateFr(statement.periodStart)} – ${formatDateFr(statement.periodEnd)}`}
        description={accountLabel ? `Compte ${accountLabel}` : undefined}
        actions={
          !statement.isDiscarded ? (
            <DiscardStatementDialog
              statementId={statement.id}
              matchedLinesCount={statement.matchedLinesCount}
            />
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Soldes et rapprochement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Solde initial</p>
            <MoneyXaf amount={statement.openingBalance} className="text-lg font-semibold" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Solde final</p>
            <MoneyXaf amount={statement.closingBalance} className="text-lg font-semibold" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lignes</p>
            <p className="text-lg font-semibold">{statement.linesCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rapprochées</p>
            <p className="text-lg font-semibold">
              {statement.matchedLinesCount} / {statement.linesCount}
            </p>
          </div>
          {statement.isDiscarded ? (
            <p role="status" className="col-span-full text-sm font-medium text-warning">
              Cet import a été abandonné : toutes les lignes sont ignorées.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="line-state-filter">Filtrer par état</Label>
        <Select
          value={stateFilter}
          onValueChange={(v) => {
            setStateFilter(v as LineState | typeof ALL_STATES);
            setCursor(undefined);
          }}
        >
          <SelectTrigger id="line-state-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATES}>Tous les états</SelectItem>
            {(Object.keys(LINE_STATE_LABELS) as LineState[]).map((s) => (
              <SelectItem key={s} value={s}>
                {LINE_STATE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={linesQuery.data?.items ?? []}
        isLoading={linesQuery.isLoading}
        emptyTitle="Aucune ligne"
        emptyDescription="Aucune ligne ne correspond à ce filtre."
        pageInfo={linesQuery.data?.pageInfo}
        onNextPage={() => {
          if (linesQuery.data?.pageInfo.nextCursor) setCursor(linesQuery.data.pageInfo.nextCursor);
        }}
      />
    </div>
  );
}
