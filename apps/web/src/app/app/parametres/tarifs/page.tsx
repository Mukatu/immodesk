'use client';

import * as React from 'react';
import Link from 'next/link';
import { PlusCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { useAuth } from '@/lib/auth/auth-context';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useSetTariffActive, useUtilityTariffs } from '@/lib/api/hooks/use-tariffs';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { METER_TYPE_LABELS } from '@/lib/enum-labels';
import type { MeterType, UtilityTariff } from '@/lib/api/types';
import { TariffRow } from './_components/tariff-row';
import { TariffFormDialog, type TariffFormState } from './_components/tariff-form-dialog';

interface PropertyGroup {
  propertyId: string | null;
  propertyName: string;
  meterGroups: { meterType: MeterType; tariffs: UtilityTariff[] }[];
}

function groupTariffs(
  tariffs: UtilityTariff[],
  propertyNames: Map<string, string>,
): PropertyGroup[] {
  const byProperty = new Map<string, UtilityTariff[]>();
  for (const tariff of tariffs) {
    const key = tariff.propertyId ?? 'GLOBAL';
    const list = byProperty.get(key) ?? [];
    list.push(tariff);
    byProperty.set(key, list);
  }
  const groups: PropertyGroup[] = [];
  for (const [key, items] of byProperty.entries()) {
    const byMeterType = new Map<MeterType, UtilityTariff[]>();
    for (const tariff of items) {
      const list = byMeterType.get(tariff.meterType) ?? [];
      list.push(tariff);
      byMeterType.set(tariff.meterType, list);
    }
    groups.push({
      propertyId: key === 'GLOBAL' ? null : key,
      propertyName:
        key === 'GLOBAL' ? 'Grille globale (tous biens)' : (propertyNames.get(key) ?? key),
      meterGroups: [...byMeterType.entries()].map(([meterType, list]) => ({
        meterType,
        tariffs: list,
      })),
    });
  }
  return groups.sort((a, b) => {
    if (a.propertyId === null) return 1;
    if (b.propertyId === null) return -1;
    return a.propertyName.localeCompare(b.propertyName);
  });
}

export default function GrillesTarifairesPage() {
  const { currentOrganization } = useAuth();
  const isOwner = currentOrganization?.role === 'OWNER';

  const [propertyId, setPropertyId] = React.useState('ALL');
  const [meterType, setMeterType] = React.useState<MeterType | 'ALL'>('ALL');
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [dialogState, setDialogState] = React.useState<TariffFormState>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const { data: propertiesData } = useProperties({ limit: 100 });
  const properties = React.useMemo(() => propertiesData?.items ?? [], [propertiesData]);
  const propertyNames = React.useMemo(
    () => new Map(properties.map((p) => [p.id, p.name])),
    [properties],
  );

  const { data, isLoading } = useUtilityTariffs({
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    meterType: meterType === 'ALL' ? undefined : meterType,
    activeOnly: activeOnly || undefined,
  });

  const toggleActive = useSetTariffActive();

  async function handleToggleActive(tariff: UtilityTariff) {
    setTogglingId(tariff.id);
    try {
      await toggleActive.mutateAsync({ id: tariff.id, isActive: !tariff.isActive });
      toast.success(tariff.isActive ? 'Tarif désactivé.' : 'Tarif réactivé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setTogglingId(null);
    }
  }

  const tariffs = React.useMemo(() => data?.items ?? [], [data]);
  const groups = React.useMemo(
    () => groupTariffs(tariffs, propertyNames),
    [tariffs, propertyNames],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Grilles tarifaires"
        description="Tarifs d'eau et d'électricité par bien, servant à la refacturation des charges."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/app/facturation/refacturation">
                <Receipt className="mr-2 size-4" aria-hidden="true" />
                Campagne de refacturation
              </Link>
            </Button>
            {isOwner ? (
              <Button type="button" onClick={() => setDialogState({ mode: 'create' })}>
                <PlusCircle className="mr-2 size-4" aria-hidden="true" />
                Nouveau tarif
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56 space-y-1">
          <label htmlFor="filter-property" className="text-sm font-medium">
            Bien
          </label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger id="filter-property" aria-label="Filtrer par bien">
              <SelectValue placeholder="Tous les biens" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les biens</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56 space-y-1">
          <label htmlFor="filter-meter-type" className="text-sm font-medium">
            Type de compteur
          </label>
          <Select value={meterType} onValueChange={(v) => setMeterType(v as MeterType | 'ALL')}>
            <SelectTrigger id="filter-meter-type" aria-label="Filtrer par type de compteur">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les types</SelectItem>
              {(Object.keys(METER_TYPE_LABELS) as MeterType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {METER_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          N&apos;afficher que les tarifs actifs
        </label>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Aucun tarif"
          description={
            isOwner
              ? 'Créez le premier tarif pour activer la refacturation des charges.'
              : "Aucun tarif n'a encore été créé pour ces filtres."
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.propertyId ?? 'GLOBAL'} className="space-y-4">
              <h2 className="text-lg font-semibold">{group.propertyName}</h2>
              {group.meterGroups.map((meterGroup) => (
                <div key={meterGroup.meterType} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {METER_TYPE_LABELS[meterGroup.meterType]}
                  </h3>
                  <div role="table" className="space-y-2">
                    {meterGroup.tariffs.map((tariff) => (
                      <TariffRow
                        key={tariff.id}
                        tariff={tariff}
                        isOwner={isOwner}
                        onEdit={() => setDialogState({ mode: 'edit', tariff })}
                        onToggleActive={() => handleToggleActive(tariff)}
                        isTogglingActive={togglingId === tariff.id && toggleActive.isPending}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {isOwner ? (
        <TariffFormDialog
          state={dialogState}
          properties={properties}
          onClose={() => setDialogState(null)}
        />
      ) : null}
    </div>
  );
}
