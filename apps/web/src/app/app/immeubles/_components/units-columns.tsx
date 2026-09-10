'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';

import { MoneyXaf } from '@/components/business/money-xaf';
import { UNIT_TYPE_LABELS } from '@/lib/enum-labels';
import type { Unit } from '@/lib/api/types';
import { UnitStatusBadge } from './unit-status-badge';

/** Colonnes partagées pour un tableau de lots (vue "Tableau des lots" et fiche immeuble). */
export function createUnitColumns(): ColumnDef<Unit>[] {
  return [
    {
      header: 'Code',
      accessorKey: 'code',
      cell: ({ row }) => (
        <Link href={`/app/lots/${row.original.id}`} className="font-medium hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      header: 'Type',
      cell: ({ row }) => (row.original.unitType ? UNIT_TYPE_LABELS[row.original.unitType] : '—'),
    },
    {
      header: 'Statut',
      cell: ({ row }) => <UnitStatusBadge status={row.original.status ?? 'AVAILABLE'} />,
    },
    {
      header: 'Loyer',
      cell: ({ row }) => <MoneyXaf amount={row.original.baseRentAmount} />,
    },
  ];
}
