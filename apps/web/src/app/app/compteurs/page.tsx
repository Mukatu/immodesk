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
import { useContextPanel } from '@/components/layout/context-panel';
import { useMeters } from '@/lib/api/hooks/use-meters';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { METER_TYPE_LABELS, enumOptions } from '@/lib/enum-labels';
import type { Meter, MeterType } from '@/lib/api/types';
import { CreateMeterDialog } from './_components/create-meter-dialog';
import { formatDateFr } from './_components/format-date-fr';

const PAGE_SIZE = 20;
const METER_TYPE_OPTIONS = enumOptions(METER_TYPE_LABELS);
/** Seuil au-delà duquel le dernier relevé d'un compteur (non prépayé) est jugé ancien. */
const STALE_READING_DAYS = 90;

export default function CompteursPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedMeterId, setSelectedMeterId] = React.useState<string | null>(null);
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

  const propertyById = React.useMemo(
    () => new Map((properties?.items ?? []).map((p) => [p.id, p])),
    [properties],
  );
  const unitById = React.useMemo(
    () => new Map((units?.items ?? []).map((u) => [u.id, u])),
    [units],
  );

  function resetPaging() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedMeterId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(meter: Meter) {
    setSelectedMeterId(meter.id);
    const property = propertyById.get(meter.propertyId);
    const unit = meter.unitId ? unitById.get(meter.unitId) : undefined;
    const daysSinceReading = meter.lastReading
      ? (Date.now() - new Date(meter.lastReading.readingDate).getTime()) / 86_400_000
      : null;
    const isStale =
      !meter.isPrepaid && (daysSinceReading === null || daysSinceReading > STALE_READING_DAYS);
    openContextPanel({
      title: 'Compteur',
      blocks: [
        {
          type: 'identity',
          title: meter.serialNumber,
          subtitle: METER_TYPE_LABELS[meter.meterType],
          badge: {
            label: meter.isActive ? 'Actif' : 'Inactif',
            tone: meter.isActive ? 'ok' : 'neutral',
          },
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Bien', v: property?.name ?? '—' },
            { k: 'Lot', v: unit?.code ?? '—' },
            {
              k: 'Partagé',
              v: meter.isShared
                ? `Oui (${((meter.sharedRatioBps ?? 0) / 100).toLocaleString('fr-FR')} %)`
                : 'Non',
            },
            { k: 'Prépayé', v: meter.isPrepaid ? 'Oui' : 'Non' },
            { k: 'Dernier index', v: meter.lastReading?.currentIndex ?? '—' },
            {
              k: 'Dernier relevé',
              v: meter.lastReading ? formatDateFr(meter.lastReading.readingDate) : '—',
            },
          ],
        },
        ...(isStale
          ? [
              {
                type: 'alert' as const,
                text: meter.lastReading
                  ? `Dernier relevé le ${formatDateFr(meter.lastReading.readingDate)}, il y a plus de ${STALE_READING_DAYS} jours.`
                  : 'Aucun relevé enregistré pour ce compteur.',
                tone: 'warning' as const,
              },
            ]
          : []),
        {
          type: 'actions',
          actions: [
            {
              label: 'Voir la fiche du compteur',
              primary: true,
              href: `/app/compteurs/${meter.id}`,
            },
            ...(unit
              ? [{ label: 'Voir le lot', href: `/app/lots/${unit.id}` }]
              : [{ label: "Voir l'immeuble", href: `/app/immeubles/${meter.propertyId}` }]),
          ],
        },
      ],
    });
  }

  const columns = React.useMemo<ColumnDef<Meter>[]>(() => {
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
  }, [propertyById, unitById]);

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
        onRowSelect={handleRowSelect}
        getRowLabel={(meter) => `Voir le détail du compteur ${meter.serialNumber}`}
        getRowClassName={(meter) =>
          meter.id === selectedMeterId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
