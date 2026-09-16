'use client';

import { Gauge } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { useMeters } from '@/lib/api/hooks/use-meters';
import { MeterCard } from './meter-card';

export interface MetersTabProps {
  unitId: string;
}

/** Onglet "Compteurs" de la fiche lot : un `MeterCard` par compteur rattaché au lot. */
export function MetersTab({ unitId }: MetersTabProps) {
  const { data, isLoading, error } = useMeters({ unitId, limit: 50 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Impossible de charger les compteurs"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const meters = data?.items ?? [];

  if (meters.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="Aucun compteur"
        description="Ce lot n'a pas encore de compteur rattaché."
      />
    );
  }

  return (
    <div className="space-y-4">
      {meters.map((meter) => (
        <MeterCard key={meter.id} meter={meter} />
      ))}
    </div>
  );
}
