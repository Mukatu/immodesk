'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { StatementStatusBadge } from '@/components/business/statement-status-badge';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import {
  useOwnerStatementRun,
  useOwnerStatements,
  useStartOwnerStatementRun,
} from '@/lib/api/hooks/use-owner-statements';
import { OWNER_STATEMENT_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { OwnerStatementStatus, OwnerStatementSummary } from '@/lib/api/types';

const STATEMENT_TONE: Record<OwnerStatementStatus, ContextPanelTone> = {
  DRAFT: 'neutral',
  ISSUED: 'info',
  SENT: 'info',
  PAID: 'ok',
  CANCELLED: 'danger',
};

export default function RelevesPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedStatementId, setSelectedStatementId] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState('');
  const [runId, setRunId] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedStatementId(null);
  }, [isContextPanelOpen]);

  const startRun = useStartOwnerStatementRun();
  const runQuery = useOwnerStatementRun(runId);
  const { data, isLoading } = useOwnerStatements({ limit: 20 });

  async function handleStart() {
    const result = await startRun.mutateAsync({ periodStart: period ? `${period}-01` : undefined });
    setRunId(result.runId);
  }

  const run = runQuery.data;

  // La liste des relevés n'est pas invalidée automatiquement par le polling du rapport :
  // on la rafraîchit nous-même dès que la campagne est terminée.
  React.useEffect(() => {
    if (run?.status === 'DONE') {
      queryClient.invalidateQueries({ queryKey: ['owner-statements'] });
    }
  }, [run?.status, queryClient]);

  const columns = React.useMemo<ColumnDef<OwnerStatementSummary>[]>(
    () => [
      {
        header: 'Numéro',
        cell: ({ row }) => (
          <Link
            href={`/app/gerance/releves/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.statementNumber}
          </Link>
        ),
      },
      { header: 'Bailleur', cell: ({ row }) => row.original.landlord.displayName },
      { header: 'Bien', cell: ({ row }) => row.original.property?.name ?? 'Consolidé' },
      { header: 'Période', cell: ({ row }) => row.original.periodStart.slice(0, 7) },
      {
        header: 'Solde net',
        cell: ({ row }) => <MoneyXaf amount={row.original.netPayableAmount} colorize />,
      },
      {
        header: 'Statut',
        cell: ({ row }) => <StatementStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  function handleRowSelect(statement: OwnerStatementSummary) {
    setSelectedStatementId(statement.id);
    openContextPanel({
      title: 'Relevé de gérance',
      blocks: [
        {
          type: 'identity',
          title: statement.statementNumber,
          subtitle: `${statement.landlord.displayName} — ${statement.property?.name ?? 'Consolidé'}`,
          badge: {
            label: OWNER_STATEMENT_STATUS_LABELS[statement.status],
            tone: STATEMENT_TONE[statement.status],
          },
        },
        {
          type: 'metric',
          title: 'Solde',
          value: formatXaf(statement.netPayableAmount),
          label: 'Solde net à reverser',
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Bailleur', v: statement.landlord.displayName },
            { k: 'Bien', v: statement.property?.name ?? 'Consolidé' },
            { k: 'Période', v: statement.periodStart.slice(0, 7) },
            { k: 'Loyers encaissés', v: formatXaf(statement.rentCollectedAmount) },
            { k: 'Commission', v: formatXaf(statement.commissionAmount) },
            { k: 'Dépenses', v: formatXaf(statement.expensesAmount) },
          ],
        },
        {
          type: 'actions',
          actions: [
            {
              label: 'Voir la fiche du relevé',
              primary: true,
              href: `/app/gerance/releves/${statement.id}`,
            },
            { label: 'Voir le bailleur', href: `/app/bailleurs/${statement.landlord.id}` },
          ],
        },
      ],
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relevés de gérance"
        description="Campagne mensuelle, relevés brouillons, émis et reversés."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lancer une campagne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="statement-run-period">
              Période (optionnel, sinon le mois civil précédent)
            </Label>
            <Input
              id="statement-run-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={handleStart}
            disabled={startRun.isPending || run?.status === 'RUNNING'}
          >
            {run?.status === 'RUNNING' ? 'Campagne en cours…' : 'Lancer la campagne'}
          </Button>
        </CardContent>
      </Card>

      {run ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {run.status === 'DONE' ? (
                <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
              ) : run.status === 'FAILED' ? (
                <XCircle className="size-5 text-destructive" aria-hidden="true" />
              ) : null}
              Rapport de campagne —{' '}
              {run.status === 'RUNNING'
                ? 'en cours'
                : run.status === 'DONE'
                  ? 'terminée'
                  : 'échouée'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Relevés créés</p>
                <p className="text-2xl font-semibold">{run.created}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mandats ignorés</p>
                <p className="text-2xl font-semibold">{run.skipped}</p>
              </div>
            </div>
            {run.errors.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bailleur</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {run.errors.map((err, index) => (
                    <TableRow key={index}>
                      <TableCell>{err.landlordId ?? '—'}</TableCell>
                      <TableCell>{err.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune erreur.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun relevé"
        emptyDescription="Lancez une campagne pour générer les premiers relevés."
        onRowSelect={handleRowSelect}
        getRowLabel={(statement) => `Voir le détail du relevé ${statement.statementNumber}`}
        getRowClassName={(statement) =>
          statement.id === selectedStatementId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
