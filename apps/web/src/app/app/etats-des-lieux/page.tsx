'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { GitCompare } from 'lucide-react';

import { DataTable } from '@/components/business/data-table';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { InspectionStatusBadge } from '@/components/business/inspection-status-badge';
import { ConditionBadge } from '@/components/business/condition-badge';
import { EnumSelect } from '@/components/business/enum-select';
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useInspections } from '@/lib/api/hooks/use-inspections';
import { useUnits } from '@/lib/api/hooks/use-units';
import {
  INSPECTION_CONDITION_LABELS,
  INSPECTION_STATUS_LABELS,
  INSPECTION_TYPE_LABELS,
} from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import type { InspectionStatus, InspectionSummary, InspectionType } from '@/lib/api/types';
import { formatDateFr } from './_components/format-date-fr';

const PAGE_SIZE = 20;

const INSPECTION_STATUS_TONE: Record<InspectionStatus, ContextPanelTone> = {
  DRAFT: 'neutral',
  IN_PROGRESS: 'info',
  PENDING_SIGNATURE: 'warning',
  SIGNED: 'ok',
  DISPUTED: 'danger',
  CANCELLED: 'neutral',
};

export default function EtatsDesLieuxPage() {
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedInspectionId, setSelectedInspectionId] = React.useState<string | null>(null);
  const [type, setType] = React.useState<InspectionType | ''>('');
  const [status, setStatus] = React.useState<InspectionStatus | ''>('');
  const [unitId, setUnitId] = React.useState('');
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [previousCursors, setPreviousCursors] = React.useState<string[]>([]);

  const { data: unitsData } = useUnits({ limit: 100 });
  const { data, isLoading } = useInspections({
    type: type || undefined,
    status: status || undefined,
    unitId: unitId || undefined,
    cursor,
    limit: PAGE_SIZE,
  });

  function resetPagination() {
    setCursor(undefined);
    setPreviousCursors([]);
  }

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedInspectionId(null);
  }, [isContextPanelOpen]);

  function handleRowSelect(inspection: InspectionSummary) {
    setSelectedInspectionId(inspection.id);
    openContextPanel({
      title: 'État des lieux',
      blocks: [
        {
          type: 'identity',
          title: inspection.reference,
          subtitle: `${inspection.unit.code} — ${inspection.property.name}`,
          badge: {
            label: INSPECTION_STATUS_LABELS[inspection.status],
            tone: INSPECTION_STATUS_TONE[inspection.status],
          },
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Type', v: INSPECTION_TYPE_LABELS[inspection.inspectionType] },
            { k: 'Locataire', v: inspection.tenant?.displayName ?? '—' },
            { k: 'Date réalisée', v: formatDateFr(inspection.performedAt) },
            {
              k: 'État général',
              v: inspection.overallCondition
                ? INSPECTION_CONDITION_LABELS[inspection.overallCondition]
                : '—',
            },
            { k: 'Dégradations', v: formatXaf(inspection.totalDamageAmount) },
          ],
        },
        ...(inspection.status === 'DISPUTED'
          ? [
              {
                type: 'alert' as const,
                text: 'Cet état des lieux est contesté : vérifiez le motif du litige.',
                tone: 'danger' as const,
              },
            ]
          : []),
        {
          type: 'actions',
          actions: [
            {
              label: "Voir la fiche de l'état des lieux",
              primary: true,
              href: `/app/etats-des-lieux/${inspection.id}`,
            },
            {
              label: 'Comparer entrée / sortie',
              href: `/app/etats-des-lieux/comparaison/${inspection.unit.id}`,
            },
            { label: 'Voir le lot', href: `/app/lots/${inspection.unit.id}` },
          ],
        },
      ],
    });
  }

  const columns = React.useMemo<ColumnDef<InspectionSummary>[]>(
    () => [
      {
        header: 'Référence',
        cell: ({ row }) => (
          <Link
            href={`/app/etats-des-lieux/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.reference}
          </Link>
        ),
      },
      {
        header: 'Lot',
        cell: ({ row }) => (
          <span>
            {row.original.unit.code} — {row.original.property.name}
          </span>
        ),
      },
      {
        header: 'Type',
        cell: ({ row }) => INSPECTION_TYPE_LABELS[row.original.inspectionType],
      },
      {
        header: 'Statut',
        cell: ({ row }) => <InspectionStatusBadge status={row.original.status} />,
      },
      {
        header: 'Date réalisée',
        cell: ({ row }) => formatDateFr(row.original.performedAt),
      },
      {
        header: 'État général',
        cell: ({ row }) =>
          row.original.overallCondition ? (
            <ConditionBadge condition={row.original.overallCondition} />
          ) : (
            '—'
          ),
      },
      {
        header: 'Dégradations',
        cell: ({ row }) => <MoneyXaf amount={row.original.totalDamageAmount} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Link
            href={`/app/etats-des-lieux/comparaison/${row.original.unit.id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <GitCompare className="size-4" aria-hidden="true" />
            Comparer entrée / sortie
          </Link>
        ),
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
        title="États des lieux"
        description="Suivez les états des lieux d'entrée, de sortie, périodiques et contradictoires."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56 space-y-1">
          <label htmlFor="type-filter" className="text-xs font-medium text-muted-foreground">
            Type
          </label>
          <EnumSelect<InspectionType>
            id="type-filter"
            value={type}
            onValueChange={(v) => {
              setType(v);
              resetPagination();
            }}
            labels={INSPECTION_TYPE_LABELS}
            placeholder="Tous les types"
          />
        </div>

        <div className="w-56 space-y-1">
          <label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">
            Statut
          </label>
          <EnumSelect<InspectionStatus>
            id="status-filter"
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPagination();
            }}
            labels={INSPECTION_STATUS_LABELS}
            placeholder="Tous les statuts"
          />
        </div>

        <div className="w-56 space-y-1">
          <label htmlFor="unit-filter" className="text-xs font-medium text-muted-foreground">
            Lot
          </label>
          <select
            id="unit-filter"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={unitId}
            onChange={(e) => {
              setUnitId(e.target.value);
              resetPagination();
            }}
          >
            <option value="">Tous les lots</option>
            {(unitsData?.items ?? []).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        emptyTitle="Aucun état des lieux"
        emptyDescription="Les états des lieux apparaissent ici une fois créés depuis le terrain."
        pageInfo={data?.pageInfo}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        hasPreviousPage={previousCursors.length > 0}
        onRowSelect={handleRowSelect}
        getRowLabel={(inspection) => `Voir le détail de l'état des lieux ${inspection.reference}`}
        getRowClassName={(inspection) =>
          inspection.id === selectedInspectionId
            ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
            : undefined
        }
      />
    </div>
  );
}
