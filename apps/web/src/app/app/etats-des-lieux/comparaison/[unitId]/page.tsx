'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PageHeader } from '@/components/business/page-header';
import { useInspection, useInspectionComparison } from '@/lib/api/hooks/use-inspections';
import { useUnit } from '@/lib/api/hooks/use-units';
import { ApiError } from '@/lib/api/client';
import type { InspectionItem } from '@/lib/api/types';
import { ComparisonItemRow } from './_components/comparison-item-row';

/** Même convention que meter-reading-chart.tsx : pas de dépendance à l'ICU du runtime. */
function formatDateFr(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Retrouve le poste de sortie apparié à une ligne de comparaison par pièce + élément. */
function findMoveOutItem(
  items: InspectionItem[] | undefined,
  roomLabel: string,
  elementLabel: string,
): InspectionItem | undefined {
  return items?.find((item) => item.roomLabel === roomLabel && item.elementLabel === elementLabel);
}

export default function InspectionComparisonPage() {
  const params = useParams<{ unitId: string }>();
  const unitId = params.unitId;
  const { data: unit } = useUnit(unitId);
  const { data: comparison, isLoading, error } = useInspectionComparison(unitId);
  const { data: moveOutDetail } = useInspection(comparison?.moveOut?.id ?? null);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError) {
    return <EmptyState title="Impossible de charger la comparaison" description={error.message} />;
  }

  if (!comparison || !comparison.moveIn || !comparison.moveOut) {
    return (
      <EmptyState
        title="Comparaison indisponible"
        description="Ce lot n'a pas à la fois un état des lieux d'entrée et de sortie signés."
      />
    );
  }

  const moveOutInspectionId = comparison.moveOut.id;

  return (
    <div className="space-y-8">
      <Link
        href={`/app/lots/${unitId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {unit?.code ?? 'Retour au lot'}
      </Link>

      <PageHeader
        title="Comparaison entrée / sortie"
        description={unit?.label ? `${unit.code} — ${unit.label}` : unit?.code}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <div className="contents">
              <dt className="font-medium text-muted-foreground">État des lieux d&apos;entrée</dt>
              <dd>
                {comparison.moveIn.reference}
                {comparison.moveIn.performedAt
                  ? ` — ${formatDateFr(comparison.moveIn.performedAt)}`
                  : ''}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">État des lieux de sortie</dt>
              <dd>
                {comparison.moveOut.reference}
                {comparison.moveOut.performedAt
                  ? ` — ${formatDateFr(comparison.moveOut.performedAt)}`
                  : ''}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Retenue totale suggérée</dt>
              <dd className="font-medium text-foreground">
                <MoneyXaf amount={comparison.totalSuggestedDeduction} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {comparison.rows.length === 0 ? (
        <EmptyState
          title="Aucun poste à comparer"
          description="Les deux états des lieux n'ont aucun poste en commun."
        />
      ) : (
        <div className="space-y-3">
          {comparison.rows.map((row) => (
            <ComparisonItemRow
              key={`${row.roomLabel}-${row.elementLabel}`}
              row={row}
              moveOutInspectionId={moveOutInspectionId}
              moveOutItem={findMoveOutItem(moveOutDetail?.items, row.roomLabel, row.elementLabel)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
