'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/business/page-header';
import { DataTable } from '@/components/business/data-table';
import { EmptyState } from '@/components/business/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { PropertyCard } from './_components/property-card';
import { createUnitColumns } from './_components/units-columns';

type ViewMode = 'cartes' | 'lots';

export default function ImmeublesPage() {
  const [q, setQ] = React.useState('');
  const [city, setCity] = React.useState('');
  const [view, setView] = React.useState<ViewMode>('cartes');

  const propertiesQuery = useProperties({ q, city });
  const unitsQuery = useUnits({ q });
  const unitColumns = React.useMemo(() => createUnitColumns(), []);

  const properties = propertiesQuery.data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Immeubles"
        description="Portefeuille de biens et de lots."
        actions={
          <Button asChild>
            <Link href="/app/immeubles/nouveau">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Nouvel immeuble
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Rechercher un immeuble ou un lot…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Rechercher"
            className="sm:max-w-xs"
          />
          <Input
            placeholder="Ville"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            aria-label="Filtrer par ville"
            className="sm:max-w-40"
          />
        </div>
        <div
          className="inline-flex items-center gap-1 self-start rounded-md border border-border p-1"
          role="group"
          aria-label="Mode d'affichage"
        >
          <Button
            type="button"
            size="sm"
            variant={view === 'cartes' ? 'default' : 'ghost'}
            aria-pressed={view === 'cartes'}
            onClick={() => setView('cartes')}
          >
            Cartes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'lots' ? 'default' : 'ghost'}
            aria-pressed={view === 'lots'}
            onClick={() => setView('lots')}
          >
            Tableau des lots
          </Button>
        </div>
      </div>

      {view === 'cartes' ? (
        propertiesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-36 w-full" />
            ))}
          </div>
        ) : properties.length === 0 ? (
          <EmptyState
            title="Aucun immeuble"
            description="Créez votre premier immeuble pour commencer à suivre votre patrimoine."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={unitColumns}
          data={unitsQuery.data?.items ?? []}
          isLoading={unitsQuery.isLoading}
          emptyTitle="Aucun lot"
          emptyDescription="Créez des lots depuis la fiche d'un immeuble."
        />
      )}
    </div>
  );
}
