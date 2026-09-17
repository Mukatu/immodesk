'use client';

import * as React from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { useMeters } from '@/lib/api/hooks/use-meters';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { METER_TYPE_LABELS, enumOptions } from '@/lib/enum-labels';
import type { Meter, MeterType } from '@/lib/api/types';
import { CreateMeterDialog } from './_components/create-meter-dialog';
import { formatDateFr } from './_components/format-date-fr';

const PAGE_SIZE = 20;
const METER_TYPE_OPTIONS = enumOptions(METER_TYPE_LABELS);

export default function CompteursPage() {
  const [propertyId, setPropertyId] = React.useState('ALL');
  const [unitId, setUnitId] = React.useState('ALL');
  const [type, setType] = React.useState<MeterType | 'ALL'>('ALL');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data: properties } = useProperties({ limit: 200 });
  const { data: units } = useUnits({
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    limit: 200,
  });
  const { data, isLoading } = useMeters({
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    unitId: unitId === 'ALL' ? undefined : unitId,
    type: type === 'ALL' ? undefined : type,
    cursor,
    limit: PAGE_SIZE,
  });

  function resetPaging() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  const columns = React.useMemo<ColumnDef<Meter>[]>(() => {
    const propertyById = new Map((properties?.items ?? []).map((p) => [p.id, p]));
    const unitById = new Map((units?.items ?? []).map((u) => [u.id, u]));
    return [
      {
        header: 'Numéro de série',
        cell: ({ row }) => (
          <Link
            href={`/app/compteurs/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.serialNumber}
          </Link>
        ),
      },
      { header: 'Type', cell: ({ row }) => METER_TYPE_LABELS[row.original.meterType] },
      {
        header: 'Bien et lot',
        cell: ({ row }) => {
          const property = propertyById.get(row.original.propertyId);
          const unit = row.original.unitId ? unitById.get(row.original.unitId) : undefined;
          return (
            <span>
              {property?.name ?? '—'}
              {unit ? ` — ${unit.code}` : ''}
            </span>
          );
        },
      },
      {
        header: 'Partagé',
        cell: ({ row }) =>
          row.original.isShared
            ? `Oui (${((row.original.sharedRatioBps ?? 0) / 100).toLocaleString('fr-FR')} %)`
            : 'Non',
      },
      { header: 'Prépayé', cell: ({ row }) => (row.original.isPrepaid ? 'Oui' : 'Non') },
      {
        header: 'Dernier index',
        cell: ({ row }) => row.original.lastReading?.currentIndex ?? '—',
      },
      {
        header: 'Dernier relevé',
        cell: ({ row }) =>
          row.original.lastReading ? formatDateFr(row.original.lastReading.readingDate) : '—',
      },
    ];
  }, [properties, units]);

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
        title="Compteurs"
        description="Compteurs d'eau et d'électricité rattachés à votre portefeuille."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/app/facturation/refacturation">
                <Receipt className="mr-2 size-4" aria-hidden="true" />
                Campagne de refacturation
              </Link>
            </Button>
            <CreateMeterDialog />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={propertyId}
          onValueChange={(v) => {
            setPropertyId(v);
            setUnitId('ALL');
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

        <Select
          value={unitId}
          onValueChange={(v) => {
            setUnitId(v);
            resetPaging();
          }}
          disabled={propertyId === 'ALL'}
        >
          <SelectTrigger className="w-48" aria-label="Filtrer par lot">
            <SelectValue placeholder="Tous les lots" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les lots</SelectItem>
            {(units?.items ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as MeterType | 'ALL');
            resetPaging();
          }}
        >
          <SelectTrigger className="w-56" aria-label="Filtrer par type de compteur">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les types</SelectItem>
            {METER_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun compteur"
        emptyDescription="Créez le premier compteur d'un bien pour suivre ses relevés."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
      />
    </div>
  );
}
