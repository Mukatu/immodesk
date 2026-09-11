'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { InvoiceStatusBadge } from '@/components/business/invoice-status-badge';
import { EnumSelect } from '@/components/business/enum-select';
import { PeriodPicker, currentPeriod } from '@/components/business/period-picker';
import { useInvoices, useIssueInvoice } from '@/lib/api/hooks/use-invoices';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { INVOICE_STATUS_LABELS } from '@/lib/enum-labels';
import type { InvoiceStatus, InvoiceSummary } from '@/lib/api/types';

const PAGE_SIZE = 20;

function IssueInvoiceAction({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string | null;
}) {
  const issueInvoice = useIssueInvoice(invoiceId);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={issueInvoice.isPending}
      onClick={async () => {
        try {
          await issueInvoice.mutateAsync();
          toast.success(`Facture ${invoiceNumber ?? ''} émise.`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Impossible d'émettre la facture.");
        }
      }}
    >
      Émettre
    </Button>
  );
}

export default function FacturesPage() {
  const [status, setStatus] = React.useState<InvoiceStatus | ''>('');
  const [period, setPeriod] = React.useState(currentPeriod());
  const [periodEnabled, setPeriodEnabled] = React.useState(false);
  const [propertyId, setPropertyId] = React.useState('');
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkIssuing, setBulkIssuing] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: propertiesData } = useProperties({ limit: 100 });
  const { data, isLoading } = useInvoices({
    status: status || undefined,
    period: periodEnabled ? period : undefined,
    propertyId: propertyId || undefined,
    overdueOnly: overdueOnly || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  function resetPagination() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const invoices = React.useMemo(() => data?.items ?? [], [data]);

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected = invoices.length > 0 && invoices.every((invoice) => selected.has(invoice.id));

  const columns = React.useMemo<ColumnDef<InvoiceSummary>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label="Sélectionner toutes les factures affichées"
            checked={allSelected}
            onChange={(e) => {
              setSelected((prev) => {
                const next = new Set(prev);
                for (const invoice of invoices) {
                  if (e.target.checked) next.add(invoice.id);
                  else next.delete(invoice.id);
                }
                return next;
              });
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Sélectionner la facture ${row.original.invoiceNumber ?? row.original.id}`}
            checked={selected.has(row.original.id)}
            onChange={(e) => toggleSelected(row.original.id, e.target.checked)}
          />
        ),
      },
      {
        header: 'Numéro',
        cell: ({ row }) => (
          <Link
            href={`/app/factures/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.invoiceNumber ?? 'Brouillon'}
          </Link>
        ),
      },
      { header: 'Locataire', cell: ({ row }) => row.original.tenant.displayName },
      {
        header: 'Immeuble / lot',
        cell: ({ row }) => `${row.original.property.name} — ${row.original.unit.code}`,
      },
      { header: 'Période', cell: ({ row }) => row.original.periodStart.slice(0, 7) },
      { header: 'Total', cell: ({ row }) => <MoneyXaf amount={row.original.totalAmount} /> },
      { header: 'Payé', cell: ({ row }) => <MoneyXaf amount={row.original.paidAmount} colorize /> },
      { header: 'Solde', cell: ({ row }) => <MoneyXaf amount={row.original.balanceAmount} /> },
      { header: 'Statut', cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} /> },
      { header: 'Échéance', cell: ({ row }) => row.original.dueDate },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) =>
          row.original.status === 'DRAFT' ? (
            <IssueInvoiceAction
              invoiceId={row.original.id}
              invoiceNumber={row.original.invoiceNumber}
            />
          ) : null,
      },
    ],
    [selected, allSelected, invoices],
  );

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Suivez l'émission et le règlement des factures de loyer."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/app/facturation/campagnes">Campagne de facturation</Link>
            </Button>
            <Button asChild>
              <Link href="/app/factures/nouvelle">Nouvelle facture</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48 space-y-1">
          <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
            Statut
          </label>
          <EnumSelect<InvoiceStatus>
            id="status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={INVOICE_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Checkbox
              checked={periodEnabled}
              onChange={(e) => {
                setPeriodEnabled(e.target.checked);
                resetPagination();
              }}
            />
            Filtrer par période
          </label>
          {periodEnabled ? (
            <PeriodPicker
              value={period}
              onValueChange={(v) => {
                setPeriod(v);
                resetPagination();
              }}
            />
          ) : null}
        </div>

        <div className="w-56 space-y-1">
          <label htmlFor="property-filter" className="text-xs font-medium text-muted-foreground">
            Immeuble
          </label>
          <select
            id="property-filter"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              resetPagination();
            }}
          >
            <option value="">Tous les immeubles</option>
            {(propertiesData?.items ?? []).map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              resetPagination();
            }}
          />
          En retard uniquement
        </label>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="text-sm">{selected.size} facture(s) sélectionnée(s)</span>
          <Button
            type="button"
            size="sm"
            disabled={bulkIssuing}
            onClick={async () => {
              setBulkIssuing(true);
              const ids = [...selected];
              let issuedCount = 0;
              for (const id of ids) {
                try {
                  await apiFetch(`/invoices/${id}/issue`, { method: 'POST' });
                  issuedCount += 1;
                } catch {
                  // erreur individuelle ignorée : rapportée globalement ci-dessous
                }
              }
              queryClient.invalidateQueries({ queryKey: ['invoices'] });
              setBulkIssuing(false);
              setSelected(new Set());
              if (issuedCount === ids.length) toast.success(`${issuedCount} facture(s) émise(s).`);
              else
                toast.warning(
                  `${issuedCount}/${ids.length} facture(s) émise(s), le reste a échoué.`,
                );
            }}
          >
            {bulkIssuing ? 'Émission…' : 'Émettre'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              toast.info(
                'Relance programmée pour plus tard (aucune route dédiée dans le contrat phase 3 : action notée localement).',
              );
              setSelected(new Set());
            }}
          >
            Relancer plus tard
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        emptyTitle="Aucune facture"
        emptyDescription="Les factures apparaissent ici une fois générées ou créées manuellement."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
