'use client';

import * as React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { ExpenseStatusBadge } from '@/components/business/expense-status-badge';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useExpenses } from '@/lib/api/hooks/use-expenses';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_STATUS_LABELS } from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import { ApproveExpenseButton } from './_components/approve-expense-button';
import { RejectExpenseDialog } from './_components/reject-expense-dialog';
import type { Expense, ExpenseStatus } from '@/lib/api/types';

const PAGE_SIZE = 20;

const EXPENSE_TONE: Record<ExpenseStatus, ContextPanelTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'ok',
  PAID: 'ok',
  REBILLED: 'neutral',
  REJECTED: 'danger',
  CANCELLED: 'danger',
};

const STATUS_FILTERS: { value: ExpenseStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'SUBMITTED', label: 'Soumises' },
  { value: 'APPROVED', label: 'Validées' },
  { value: 'PAID', label: 'Payées' },
  { value: 'REJECTED', label: 'Rejetées' },
];

export default function DepensesPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedExpenseId, setSelectedExpenseId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<ExpenseStatus | 'ALL'>('ALL');
  const [propertyId, setPropertyId] = React.useState<string>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedExpenseId(null);
  }, [isContextPanelOpen]);

  const { data: properties } = useProperties({ limit: 100 });
  const { data, isLoading } = useExpenses({
    status: status === 'ALL' ? undefined : status,
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    cursor,
    limit: PAGE_SIZE,
  });

  function resetPaging() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const columns = React.useMemo<ColumnDef<Expense>[]>(
    () => [
      { header: 'Référence', cell: ({ row }) => row.original.reference },
      { header: 'Date', cell: ({ row }) => row.original.expenseDate },
      {
        header: 'Bien',
        cell: ({ row }) => row.original.property?.name ?? '—',
      },
      { header: 'Catégorie', cell: ({ row }) => EXPENSE_CATEGORY_LABELS[row.original.category] },
      { header: 'Libellé', cell: ({ row }) => row.original.label },
      {
        header: 'Montant',
        cell: ({ row }) => <MoneyXaf amount={row.original.totalAmount} />,
      },
      {
        header: 'Refacturable',
        cell: ({ row }) =>
          row.original.isRebillable ? (
            <Badge
              variant="secondary"
              title="Ne figure pas au relevé du bailleur : refacturée au locataire."
            >
              Refacturable au locataire
            </Badge>
          ) : (
            '—'
          ),
      },
      {
        header: 'Statut',
        cell: ({ row }) => <ExpenseStatusBadge status={row.original.status} />,
      },
      {
        header: 'Actions',
        cell: ({ row }) =>
          row.original.status === 'SUBMITTED' ? (
            <div className="flex gap-2">
              <ApproveExpenseButton expenseId={row.original.id} />
              <RejectExpenseDialog expenseId={row.original.id} />
            </div>
          ) : null,
      },
    ],
    [],
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

  function handleRowSelect(expense: Expense) {
    setSelectedExpenseId(expense.id);
    openContextPanel({
      title: 'Dépense',
      blocks: [
        {
          type: 'identity',
          title: expense.reference,
          subtitle: expense.label,
          badge: {
            label: EXPENSE_STATUS_LABELS[expense.status],
            tone: EXPENSE_TONE[expense.status],
          },
        },
        {
          type: 'metric',
          title: 'Montant',
          value: formatXaf(expense.totalAmount),
          label: 'Total TTC',
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Fournisseur', v: expense.supplierName ?? '—' },
            { k: 'Catégorie', v: EXPENSE_CATEGORY_LABELS[expense.category] },
            { k: 'Bien', v: expense.property?.name ?? '—' },
            { k: 'Bailleur', v: expense.landlord?.displayName ?? '—' },
            { k: 'Justificatif', v: expense.invoiceDocumentId ? 'Joint' : 'Absent' },
            { k: 'Date', v: new Date(expense.expenseDate).toLocaleDateString('fr-CG') },
          ],
        },
        ...(!expense.invoiceDocumentId
          ? [
              {
                type: 'alert' as const,
                tone: 'warning' as const,
                text: 'Aucun justificatif n’est joint à cette dépense.',
              },
            ]
          : []),
        {
          type: 'actions',
          actions: [
            expense.property
              ? {
                  label: 'Voir la fiche du bien',
                  primary: true,
                  href: `/app/immeubles/${expense.property.id}`,
                }
              : {
                  label: 'Voir la fiche du bailleur',
                  primary: true,
                  href: `/app/bailleurs/${expense.landlord?.id ?? ''}`,
                },
            ...(expense.landlord
              ? [{ label: 'Voir le bailleur', href: `/app/bailleurs/${expense.landlord.id}` }]
              : []),
          ],
        },
      ],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dépenses"
        description="Saisie, validation et suivi des dépenses imputables aux bailleurs."
        actions={
          <Button asChild>
            <Link href="/app/gerance/depenses/nouvelle">
              <PlusCircle className="mr-2 size-4" aria-hidden="true" />
              Nouvelle dépense
            </Link>
          </Button>
        }
      />

      <p className="text-sm text-muted-foreground">
        Une dépense refacturable au locataire part en ligne de facture et ne figure jamais au relevé
        de gérance du bailleur, pour ne pas la compter deux fois.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtres de statut">
          {STATUS_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={status === item.value ? 'default' : 'outline'}
              onClick={() => {
                setStatus(item.value);
                resetPaging();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Select
          value={propertyId}
          onValueChange={(v) => {
            setPropertyId(v);
            resetPaging();
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filtrer par bien">
            <SelectValue placeholder="Tous les biens" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les biens</SelectItem>
            {(properties?.items ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucune dépense"
        emptyDescription="Saisissez la première dépense d'un bien sous mandat."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(expense) => `Voir le détail de la dépense ${expense.reference}`}
        getRowClassName={(expense) =>
          expense.id === selectedExpenseId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
