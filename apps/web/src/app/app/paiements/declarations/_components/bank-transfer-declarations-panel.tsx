'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { EnumSelect } from '@/components/business/enum-select';
import { AgedDeclarationNotice } from '@/components/business/aged-declaration-notice';
import { DeclarationStatusBadge } from '@/components/business/declaration-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useBankTransferDeclarations } from '@/lib/api/hooks/use-bank-transfer-declarations';
import { TRANSFER_DECLARATION_STATUS_LABELS } from '@/lib/enum-labels';
import type { DeclarationStatus, TransferDeclaration } from '@/lib/api/types';
import { BankTransferDeclarationDetail } from './bank-transfer-declaration-detail';

const PAGE_SIZE = 20;

/** File des déclarations de virement, triée par ancienneté (la plus ancienne en tête). */
export function BankTransferDeclarationsPanel() {
  const [status, setStatus] = React.useState<DeclarationStatus | ''>('SUBMITTED');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data, isLoading } = useBankTransferDeclarations({
    status: status || undefined,
    limit: PAGE_SIZE,
  });

  const declarations = React.useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => b.ageHours - a.ageHours);
  }, [data]);

  const selected = declarations.find((d) => d.id === selectedId) ?? null;

  const columns = React.useMemo<ColumnDef<TransferDeclaration>[]>(
    () => [
      {
        header: 'Virement',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setSelectedId(row.original.id)}
          >
            {row.original.transferReference ?? row.original.id}
          </button>
        ),
      },
      { header: 'Locataire', cell: ({ row }) => row.original.tenant?.displayName ?? '—' },
      { header: 'Payeur', cell: ({ row }) => row.original.payerName },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.declaredAmount} /> },
      {
        header: 'Statut',
        cell: ({ row }) => <DeclarationStatusBadge status={row.original.status} />,
      },
      {
        header: 'Ancienneté',
        cell: ({ row }) => <AgedDeclarationNotice ageHours={row.original.ageHours} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="w-56 space-y-1">
        <label
          htmlFor="transfer-status-filter"
          className="text-xs font-medium text-muted-foreground"
        >
          Statut
        </label>
        <EnumSelect<DeclarationStatus>
          id="transfer-status-filter"
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setSelectedId(null);
          }}
          labels={TRANSFER_DECLARATION_STATUS_LABELS}
          placeholder="Tous les statuts"
        />
      </div>

      <DataTable
        columns={columns}
        data={declarations}
        isLoading={isLoading}
        emptyTitle="Aucune déclaration"
        emptyDescription="Les déclarations de virement apparaissent ici une fois soumises par un démarcheur."
      />

      {selected ? (
        <BankTransferDeclarationDetail declaration={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
