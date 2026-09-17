'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { PageHeader } from '@/components/business/page-header';
import { useMeter, useCreateMeterReading } from '@/lib/api/hooks/use-meters';
import { useProperty } from '@/lib/api/hooks/use-properties';
import { useUnit } from '@/lib/api/hooks/use-units';
import { useAuth } from '@/lib/auth/auth-context';
import { METER_TYPE_LABELS } from '@/lib/enum-labels';
import { AddReadingDialog } from './_components/add-reading-dialog';
import { EditMeterDialog } from './_components/edit-meter-dialog';
import { formatDateFr } from '../_components/format-date-fr';
import { ReadingsSection } from './_components/readings-section';

export default function CompteurDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { currentOrganization } = useAuth();
  const { data: meter, isLoading } = useMeter(id);
  const { data: property } = useProperty(meter?.propertyId ?? null);
  const { data: unit } = useUnit(meter?.unitId ?? null);
  const createReading = useCreateMeterReading(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!meter) {
    return (
      <EmptyState
        title="Compteur introuvable"
        description="Ce compteur n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link href="/app/compteurs">Retour à la liste des compteurs</Link>
          </Button>
        }
      />
    );
  }

  const canConfirm = currentOrganization?.role === 'MANAGER';
  const photoRelatedEntityType = meter.unitId ? ('unit' as const) : ('property' as const);
  const photoRelatedEntityId = meter.unitId ?? meter.propertyId;

  return (
    <div className="space-y-8">
      <PageHeader
        title={meter.serialNumber}
        description={`${METER_TYPE_LABELS[meter.meterType]} · ${property?.name ?? '—'}${
          unit ? ` · ${unit.code}` : ''
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EditMeterDialog meter={meter} />
            <AddReadingDialog
              photoRelatedEntityType={photoRelatedEntityType}
              photoRelatedEntityId={photoRelatedEntityId}
              onSubmit={(input) => createReading.mutateAsync(input)}
            />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Caractéristiques</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Type</dt>
              <dd className="text-foreground">{METER_TYPE_LABELS[meter.meterType]}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Bien</dt>
              <dd className="text-foreground">{property?.name ?? '—'}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Lot</dt>
              <dd className="text-foreground">{unit?.code ?? 'Compteur commun au bien'}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Nombre de chiffres</dt>
              <dd className="text-foreground">{meter.digitsCount}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Compteur partagé</dt>
              <dd className="text-foreground">
                {meter.isShared
                  ? `Oui — quote-part ${((meter.sharedRatioBps ?? 0) / 100).toLocaleString('fr-FR')} %`
                  : 'Non'}
              </dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Prépayé</dt>
              <dd className="text-foreground">{meter.isPrepaid ? 'Oui' : 'Non'}</dd>
            </div>
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Installé le</dt>
              <dd className="text-foreground">
                {meter.installedAt ? formatDateFr(meter.installedAt) : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relevés et consommation</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadingsSection meterId={meter.id} canConfirm={canConfirm} />
        </CardContent>
      </Card>
    </div>
  );
}
