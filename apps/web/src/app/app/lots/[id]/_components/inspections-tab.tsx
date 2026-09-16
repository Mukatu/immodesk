'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { InspectionStatusBadge } from '@/components/business/inspection-status-badge';
import { useInspectionComparison, useInspections } from '@/lib/api/hooks/use-inspections';
import { INSPECTION_TYPE_LABELS } from '@/lib/enum-labels';

/** Même convention que meter-reading-chart.tsx : pas de dépendance à l'ICU du runtime. */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export interface InspectionsTabProps {
  unitId: string;
}

/**
 * Onglet "États des lieux" de la fiche lot : historique des inspections du
 * lot, avec accès à l'écran de comparaison entrée/sortie dès qu'un
 * `MOVE_IN` et un `MOVE_OUT` signés existent tous les deux (même logique que
 * `GET /units/{id}/inspections/compare`, qui renvoie alors `moveIn`/`moveOut`
 * non nuls).
 */
export function InspectionsTab({ unitId }: InspectionsTabProps) {
  const { data, isLoading, error } = useInspections({ unitId, limit: 50 });
  const { data: comparison } = useInspectionComparison(unitId);
  const canCompare = Boolean(comparison?.moveIn && comparison?.moveOut);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Impossible de charger les états des lieux"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const inspections = data?.items ?? [];

  return (
    <div className="space-y-4">
      {canCompare ? (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/etats-des-lieux/comparaison/${unitId}`}>
              Comparer entrée / sortie
            </Link>
          </Button>
        </div>
      ) : null}

      {inspections.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun état des lieux"
          description="Ce lot n'a pas encore d'état des lieux enregistré."
        />
      ) : (
        <ul role="list" className="divide-y divide-border rounded-md border border-border">
          {inspections.map((inspection) => (
            <li
              key={inspection.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">
                  {INSPECTION_TYPE_LABELS[inspection.inspectionType]}
                </p>
                <p className="text-muted-foreground">{inspection.reference}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {inspection.performedAt
                    ? formatDateFr(inspection.performedAt)
                    : inspection.scheduledAt
                      ? formatDateFr(inspection.scheduledAt)
                      : 'Date non planifiée'}
                </span>
                <InspectionStatusBadge status={inspection.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
