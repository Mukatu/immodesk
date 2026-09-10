'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { DocumentList, DocumentUploader } from '@/components/business/document-uploader';
import { EmptyState } from '@/components/business/empty-state';
import { useUnit } from '@/lib/api/hooks/use-units';
import { UNIT_TYPE_LABELS } from '@/lib/enum-labels';
import { ApiError } from '@/lib/api/client';
import { UnitStatusBadge } from '../../immeubles/_components/unit-status-badge';
import { UnitEditSheet } from '../../immeubles/_components/unit-edit-sheet';

export default function LotDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: unit, isLoading, error } = useUnit(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="Lot introuvable"
        description="Ce lot n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/immeubles">Retour à la liste des immeubles</Link>
          </Button>
        }
      />
    );
  }

  if (error || !unit) {
    return (
      <EmptyState
        title="Impossible de charger ce lot"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const amenityEntries = Object.entries(unit.amenities ?? {});

  return (
    <div className="space-y-8">
      <Link
        href={`/app/immeubles/${unit.property.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {unit.property.name}
      </Link>

      <PageHeader
        title={unit.label ? `${unit.code} — ${unit.label}` : unit.code}
        description={unit.unitType ? UNIT_TYPE_LABELS[unit.unitType] : undefined}
        actions={<UnitEditSheet unit={unit} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Caractéristiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <UnitStatusBadge status={unit.status ?? 'AVAILABLE'} />
            {unit.isFurnished ? <Badge variant="outline">Meublé</Badge> : null}
            {unit.hasPrivateMeter ? <Badge variant="outline">Compteur privatif</Badge> : null}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {unit.floorNumber !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Étage</dt>
                <dd className="text-foreground">{unit.floorNumber}</dd>
              </div>
            ) : null}
            {unit.roomsCount !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Pièces</dt>
                <dd className="text-foreground">{unit.roomsCount}</dd>
              </div>
            ) : null}
            {unit.bedroomsCount !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Chambres</dt>
                <dd className="text-foreground">{unit.bedroomsCount}</dd>
              </div>
            ) : null}
            {unit.bathroomsCount !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Douches/WC</dt>
                <dd className="text-foreground">{unit.bathroomsCount}</dd>
              </div>
            ) : null}
            {unit.areaSqm !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Surface</dt>
                <dd className="text-foreground">{unit.areaSqm} m²</dd>
              </div>
            ) : null}
          </dl>
          {amenityEntries.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {amenityEntries.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="font-medium text-muted-foreground">{key}</dt>
                  <dd className="text-foreground">{String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loyer de référence</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Loyer de base</dt>
              <dd className="text-foreground">
                <MoneyXaf amount={unit.baseRentAmount} />
              </dd>
            </div>
            {unit.baseChargesAmount !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Charges</dt>
                <dd className="text-foreground">
                  <MoneyXaf amount={unit.baseChargesAmount} />
                </dd>
              </div>
            ) : null}
            {unit.depositMonths !== undefined ? (
              <div className="contents">
                <dt className="font-medium text-muted-foreground">Caution</dt>
                <dd className="text-foreground">{unit.depositMonths} mois</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader
            relatedEntityType="unit"
            relatedEntityId={unit.id}
            kind="PROPERTY_PHOTO"
          />
          <DocumentList relatedEntityType="unit" relatedEntityId={unit.id} kind="PROPERTY_PHOTO" />
        </CardContent>
      </Card>
    </div>
  );
}
