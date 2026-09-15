'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { ImportReportPanel } from '@/components/business/import-report-panel';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useAuth } from '@/lib/auth/auth-context';
import { useBankAccounts } from '@/lib/api/hooks/use-bank-accounts';
import { useBankStatementAdapters } from '@/lib/api/hooks/use-bank-statement-adapters';
import { useBankStatements, useImportBankStatement } from '@/lib/api/hooks/use-bank-statements';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { BANK_STATEMENT_STATUS_LABELS, STATEMENT_FORMAT_LABELS } from '@/lib/enum-labels';
import type {
  BankStatementStatus,
  Document,
  ImportReport,
  StatementFormat,
  StatementSummary,
} from '@/lib/api/types';

const STATEMENT_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'] as const;
const STATEMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const PAGE_SIZE = 20;
const AUTO_DETECT = 'AUTO';

/** Messages fr-CG plus explicites que le libellé brut renvoyé par l'API pour les cas connus. */
const BANK_STATEMENT_ERROR_MESSAGES: Record<string, string> = {
  'BANK.STATEMENT_ALREADY_IMPORTED':
    'Ce fichier a déjà été importé pour ce compte. Consultez la liste des relevés ci-dessous.',
  'BANK.STATEMENT_FORMAT_UNKNOWN':
    "Le format du fichier n'a pas pu être détecté automatiquement. Choisissez le format manuellement.",
  'BANK.STATEMENT_BALANCE_MISMATCH':
    "Le solde de clôture ne correspond pas aux mouvements du fichier (crédits/débits). Aucune ligne n'a été créée.",
  'BANK.STATEMENT_CURRENCY_UNSUPPORTED':
    'Le relevé contient au moins une ligne dans une devise autre que le XAF. Import refusé.',
  'BANK.STATEMENT_PERIOD_INVALID':
    'La période du relevé est invalide (la date de début doit précéder la date de fin).',
};

function importErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return BANK_STATEMENT_ERROR_MESSAGES[err.code] ?? err.message ?? genericErrorMessage;
  }
  return genericErrorMessage;
}

function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const STATEMENT_STATUS_VARIANT: Record<BankStatementStatus, NonNullable<BadgeProps['variant']>> = {
  UPLOADED: 'secondary',
  PARSING: 'warning',
  PARSED: 'secondary',
  RECONCILING: 'warning',
  RECONCILED: 'success',
  FAILED: 'destructive',
};

export default function RelevesBancairesPage() {
  const [bankAccountId, setBankAccountId] = React.useState<string>('');
  const [format, setFormat] = React.useState<string>(AUTO_DETECT);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<ImportReport | null>(null);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { currentOrganizationId } = useAuth();
  // Tous les comptes de l'organisation (le compte crédité par les loyers peut
  // être celui de l'agence comme celui d'un bailleur sous mandat).
  const accounts = useBankAccounts();
  const adapters = useBankStatementAdapters();
  const { data, isLoading } = useBankStatements(bankAccountId || null, {
    cursor,
    limit: PAGE_SIZE,
  });
  const importStatement = useImportBankStatement(bankAccountId);

  const accountItems = accounts.data?.items ?? [];

  function handleAccountChange(next: string) {
    setBankAccountId(next);
    setCursor(undefined);
    setPreviousCursors([]);
    setReport(null);
    setImportError(null);
  }

  function handleNextPage() {
    if (data?.pageInfo.nextCursor) {
      setPreviousCursors((prev) => [...prev, cursor ?? '']);
      setCursor(data.pageInfo.nextCursor);
    }
  }

  function handlePreviousPage() {
    setPreviousCursors((prev) => {
      const next = [...prev];
      const last = next.pop();
      setCursor(last || undefined);
      return next;
    });
  }

  async function handleImport(documentId: string) {
    if (!bankAccountId) return;
    setImportError(null);
    try {
      const result = await importStatement.mutateAsync({
        documentId,
        format: format === AUTO_DETECT ? undefined : (format as StatementFormat),
      });
      setReport(result);
      toast.success('Relevé importé.');
    } catch (err) {
      setReport(null);
      setImportError(importErrorMessage(err));
    }
  }

  const columns = React.useMemo<ColumnDef<StatementSummary>[]>(
    () => [
      {
        header: 'Période',
        cell: ({ row }) => (
          <Link
            href={`/app/banque/releves/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {formatDateFr(row.original.periodStart)} – {formatDateFr(row.original.periodEnd)}
          </Link>
        ),
      },
      { header: 'Format', cell: ({ row }) => STATEMENT_FORMAT_LABELS[row.original.format] },
      {
        header: 'Statut',
        cell: ({ row }) => (
          <Badge variant={STATEMENT_STATUS_VARIANT[row.original.status]}>
            {BANK_STATEMENT_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        header: 'Solde initial',
        cell: ({ row }) => <MoneyXaf amount={row.original.openingBalance} />,
      },
      {
        header: 'Solde final',
        cell: ({ row }) => <MoneyXaf amount={row.original.closingBalance} />,
      },
      {
        header: 'Rapprochement',
        cell: ({ row }) => {
          const { linesCount, matchedLinesCount } = row.original;
          if (linesCount === 0) return '—';
          const pct = Math.round((matchedLinesCount / linesCount) * 100);
          return `${pct} % (${matchedLinesCount}/${linesCount})`;
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relevés bancaires"
        description="Importez les relevés et suivez leur rapprochement avec la comptabilité."
      />

      <Card>
        <CardHeader>
          <CardTitle>Compte bancaire</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="bank-account-select">Compte</Label>
          <Select value={bankAccountId || undefined} onValueChange={handleAccountChange}>
            <SelectTrigger id="bank-account-select" className="sm:w-80">
              <SelectValue placeholder="Choisir un compte de l'organisation" />
            </SelectTrigger>
            <SelectContent>
              {accountItems.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {bankAccountId ? (
        <Card>
          <CardHeader>
            <CardTitle>Importer un relevé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="format-select">Format</Label>
              <Select value={format} onValueChange={setFormat} disabled={importStatement.isPending}>
                <SelectTrigger id="format-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_DETECT}>Détection automatique</SelectItem>
                  {(adapters.data?.items ?? []).map((adapter) => (
                    <SelectItem key={adapter.code} value={adapter.format}>
                      {adapter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {importError ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {importError}
              </p>
            ) : null}

            <DocumentUploader
              kind="BANK_STATEMENT"
              relatedEntityType="organization"
              relatedEntityId={currentOrganizationId ?? ''}
              acceptedMimeTypes={STATEMENT_MIME_TYPES}
              maxSizeBytes={STATEMENT_MAX_SIZE_BYTES}
              onUploaded={(doc: Document) => {
                void handleImport(doc.id);
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {report ? <ImportReportPanel report={report} /> : null}

      {bankAccountId ? (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          isLoading={isLoading}
          emptyTitle="Aucun relevé"
          emptyDescription="Les relevés importés pour ce compte apparaîtront ici."
          pageInfo={data?.pageInfo}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          hasPreviousPage={previousCursors.length > 0}
        />
      ) : (
        <EmptyState
          title="Choisissez un compte"
          description="Sélectionnez un compte bancaire de l'organisation pour voir et importer ses relevés."
        />
      )}
    </div>
  );
}
