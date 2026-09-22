'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Droplets, Fuel, Sofa, Sun, Zap } from 'lucide-react';

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
import { useContextPanel, type ContextPanelTone } from '@/components/layout/context-panel';
import { useProperty } from '@/lib/api/hooks/use-properties';
import {
  FURNITURE_ITEM_LABELS,
  PROPERTY_TYPE_LABELS,
  UNIT_STATUS_LABELS,
  UNIT_TYPE_LABELS,
} from '@/lib/enum-labels';
import { formatXaf } from '@/lib/money';
import { ApiError } from '@/lib/api/client';
import type { Unit, UnitStatus } from '@/lib/api/types';
import { BulkUnitsDialog } from '../_components/bulk-units-dialog';
import { createUnitColumns } from '../_components/units-columns';

const UNIT_STATUS_TONE: Record<UnitStatus, ContextPanelTone> = {
  AVAILABLE: 'ok',
  OCCUPIED: 'neutral',
  RESERVED: 'warning',
  UNDER_MAINTENANCE: 'warning',
  UNAVAILABLE: 'neutral',
};

export default function ImmeubleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { open: openContextPanel, isOpen: isContextPanelOpen } = useContextPanel();
  const [selectedUnitId, setSelectedUnitId] = React.useState<string | null>(null);
  const { data: property, isLoading, error } = useProperty(id);
  const unitColumns = React.useMemo(() => createUnitColumns(), []);

  React.useEffect(() => {
    if (!isContextPanelOpen) setSelectedUnitId(null);
  }, [isContextPanelOpen]);

  function handleUnitRowSelect(unit: Unit) {
    setSelectedUnitId(unit.id);
    const status = unit.status ?? 'AVAILABLE';
    openContextPanel({
      title: 'Lot',
      blocks: [
        {
          type: 'identity',
          title: unit.code,
          subtitle: unit.unitType ? UNIT_TYPE_LABELS[unit.unitType] : undefined,
          badge: { label: UNIT_STATUS_LABELS[status], tone: UNIT_STATUS_TONE[status] },
        },
        {
          type: 'keyvalue',
          title: 'Détails',
          items: [
            { k: 'Type', v: unit.unitType ? UNIT_TYPE_LABELS[unit.unitType] : '—' },
            { k: 'Loyer', v: formatXaf(unit.baseRentAmount) },
            { k: 'Charges', v: formatXaf(unit.baseChargesAmount ?? 0) },
            {
              k: 'Dépôt de garantie',
              v: unit.depositMonths ? `${unit.depositMonths} mois` : '—',
            },
            { k: 'Surface', v: unit.areaSqm ? `${unit.areaSqm} m²` : '—' },
          ],
        },
        ...(status === 'UNDER_MAINTENANCE'
          ? [
              {
                type: 'alert' as const,
                text: 'Ce lot est actuellement en travaux.',
                tone: 'warning' as const,
              },
            ]
          : []),
        {
          type: 'actions',
          actions: property
            ? [
                { label: 'Voir la fiche du lot', primary: true, href: `/app/lots/${unit.id}` },
                { label: 'Voir le bailleur', href: `/app/bailleurs/${property.landlord.id}` },
              ]
            : [{ label: 'Voir la fiche du lot', primary: true, href: `/app/lots/${unit.id}` }],
        },
      ],
    });
  }

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
    ...(property.hasGenerator ? [{ label: 'Groupe électrogène', icon: Fuel }] : []),
    ...(property.hasSolarPanels ? [{ label: 'Panneaux solaires', icon: Sun }] : []),
    ...(property.isFurnished ? [{ label: 'Meublé', icon: Sofa }] : []),
  ];

  const details: Array<{ label: string; value: string }> = [
    ...(property.landTitleReference
      ? [{ label: 'Titre foncier', value: property.landTitleReference }]
      : []),
    ...(property.parcelNumber ? [{ label: "Permis d'occuper", value: property.parcelNumber }] : []),
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

      {property.isFurnished && property.furniture && property.furniture.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Meubles et équipements fournis</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {property.furniture.map((entry) => (
                <div key={entry.item} className="contents">
                  <dt className="font-medium text-muted-foreground">
                    {FURNITURE_ITEM_LABELS[entry.item]}
                  </dt>
                  <dd className="text-foreground">
                    {entry.quantity ? `× ${entry.quantity}` : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

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
            onRowSelect={handleUnitRowSelect}
            getRowLabel={(unit) => `Voir le détail du lot ${unit.code}`}
            getRowClassName={(unit) =>
              unit.id === selectedUnitId
                ? 'relative bg-muted/60 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-accent'
                : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
