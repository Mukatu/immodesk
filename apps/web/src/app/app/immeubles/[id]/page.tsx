'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Droplets, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { AddressBlock } from '@/components/business/address-block';
import { OccupancyBadge } from '@/components/business/occupancy-badge';
import { PhoneDisplay } from '@/components/business/phone-display';
import { DataTable } from '@/components/business/data-table';
import { EmptyState } from '@/components/business/empty-state';
import { Button } from '@/components/ui/button';
import { useProperty } from '@/lib/api/hooks/use-properties';
import { PROPERTY_TYPE_LABELS } from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/client';
import { BulkUnitsDialog } from '../_components/bulk-units-dialog';
import { createUnitColumns } from '../_components/units-columns';

export default function ImmeubleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: property, isLoading, error } = useProperty(id);
  const unitColumns = React.useMemo(() => createUnitColumns(), []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Immeuble introuvable"
        description="Cet immeuble n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/immeubles">Retour à la liste des immeubles</Link>
          </Button>
        }
      />
    );
  }

  if (error || !property) {
    return (
      <EmptyState
        title="Impossible de charger cet immeuble"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const amenities: Array<{ label: string; icon: LucideIcon }> = [
    ...(property.hasWater ? [{ label: 'Eau courante', icon: Droplets }] : []),
    ...(property.hasElectricity ? [{ label: 'Électricité', icon: Zap }] : []),
    ...(property.hasBorehole ? [{ label: 'Forage', icon: Droplets }] : []),
  ];

  const details: Array<{ label: string; value: string }> = [
    ...(property.landTitleReference
      ? [{ label: 'Titre foncier', value: property.landTitleReference }]
      : []),
    ...(property.parcelNumber ? [{ label: 'N° de parcelle', value: property.parcelNumber }] : []),
    ...(property.builtYear
      ? [{ label: 'Année de construction', value: String(property.builtYear) }]
      : []),
    ...(property.totalAreaSqm
      ? [{ label: 'Surface totale', value: `${property.totalAreaSqm} m²` }]
      : []),
    ...(property.floorsCount
      ? [{ label: "Nombre d'étages", value: String(property.floorsCount) }]
      : []),
  ];

  return (
    <div className="space-y-8">
      <Link
        href="/app/immeubles"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour aux immeubles
      </Link>

      <PageHeader
        title={property.name}
        description={
          property.propertyType ? PROPERTY_TYPE_LABELS[property.propertyType] : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Localisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressBlock
            addressLine={property.addressLine}
            district={property.district}
            arrondissement={property.arrondissement}
            landmark={property.landmark}
            city={property.city}
          />
          {details.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {details.map((detail) => (
                <div key={detail.label} className="contents">
                  <dt className="font-medium text-muted-foreground">{detail.label}</dt>
                  <dd className="text-foreground">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map(({ label, icon: Icon }) => (
                <Badge key={label} variant="outline" className="gap-1">
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bailleur</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <Link
              href={`/app/bailleurs/${property.landlord.id}`}
              className="font-medium hover:underline"
            >
              {property.landlord.displayName}
            </Link>
            <PhoneDisplay phone={property.landlord.primaryPhone} whatsapp />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <CardTitle>Lots</CardTitle>
            <OccupancyBadge occupancy={property.occupancy} />
          </div>
          <BulkUnitsDialog propertyId={property.id} />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={unitColumns}
            data={property.units}
            emptyTitle="Aucun lot"
            emptyDescription="Créez des lots en série pour commencer à louer ce bien."
          />
        </CardContent>
      </Card>
    </div>
  );
}
