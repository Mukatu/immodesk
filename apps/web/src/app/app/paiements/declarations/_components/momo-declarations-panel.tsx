'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/business/data-table';
import { EnumSelect } from '@/components/business/enum-select';
import { AgedDeclarationNotice } from '@/components/business/aged-declaration-notice';
import { MomoStatusBadge } from '@/components/business/momo-status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { OperatorBadge } from '@/components/business/operator-badge';
import { useMomoDeclarations } from '@/lib/api/hooks/use-mobile-money-declarations';
import { MOMO_STATUS_LABELS } from '@/lib/enum-labels';
import { hoursSince } from '@/lib/aging';
import type { MomoStatus, MomoTransaction } from '@/lib/api/types';
import { MomoDeclarationDetail } from './momo-declaration-detail';

const PAGE_SIZE = 20;

/** File des déclarations Mobile Money, triée par ancienneté (la plus ancienne en tête). */
export function MomoDeclarationsPanel() {
  const [status, setStatus] = React.useState<MomoStatus | ''>('DECLARED');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data, isLoading } = useMomoDeclarations({
    status: status || undefined,
    limit: PAGE_SIZE,
  });

  const declarations = React.useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => (a.initiatedAt < b.initiatedAt ? -1 : 1));
  }, [data]);

  const selected = declarations.find((d) => d.id === selectedId) ?? null;

  const columns = React.useMemo<ColumnDef<MomoTransaction>[]>(
    () => [
      {
        header: 'Déclaration',
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setSelectedId(row.original.id)}
          >
            {row.original.merchantReference}
          </button>
        ),
      },
      { header: 'Locataire', cell: ({ row }) => row.original.tenant?.displayName ?? '—' },
      {
        header: 'Opérateur',
        cell: ({ row }) => <OperatorBadge msisdn={row.original.payerMsisdn} />,
      },
      { header: 'Montant', cell: ({ row }) => <MoneyXaf amount={row.original.amount} /> },
      { header: 'Statut', cell: ({ row }) => <MomoStatusBadge status={row.original.status} /> },
      {
        header: 'Ancienneté',
        cell: ({ row }) => (
          <AgedDeclarationNotice ageHours={hoursSince(row.original.initiatedAt)} />
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="w-56 space-y-1">
        <label htmlFor="momo-status-filter" className="text-xs font-medium text-muted-foreground">
          Statut
        </label>
        <EnumSelect<MomoStatus>
          id="momo-status-filter"
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setSelectedId(null);
          }}
          labels={MOMO_STATUS_LABELS}
          placeholder="Tous les statuts"
        />
      </div>

      <DataTable
        columns={columns}
        data={declarations}
        isLoading={isLoading}
        emptyTitle="Aucune déclaration"
        emptyDescription="Les déclarations Mobile Money apparaissent ici une fois saisies par un démarcheur."
      />

      {selected ? (
        <MomoDeclarationDetail declaration={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
