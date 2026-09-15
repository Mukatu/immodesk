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
import { useExpenses } from '@/lib/api/hooks/use-expenses';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/enum-labels';
import { ApproveExpenseButton } from './_components/approve-expense-button';
import { RejectExpenseDialog } from './_components/reject-expense-dialog';
import type { Expense, ExpenseStatus } from '@/lib/api/types';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: ExpenseStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'SUBMITTED', label: 'Soumises' },
  { value: 'APPROVED', label: 'Validées' },
  { value: 'PAID', label: 'Payées' },
  { value: 'REJECTED', label: 'Rejetées' },
];

export default function DepensesPage() {
  const [status, setStatus] = React.useState<ExpenseStatus | 'ALL'>('ALL');
  const [propertyId, setPropertyId] = React.useState<string>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

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
      />
    </div>
  );
}
