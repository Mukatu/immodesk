'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { useCreateUtilityTariff, useUpdateUtilityTariff } from '@/lib/api/hooks/use-tariffs';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { METER_TYPE_LABELS, TARIFF_BASIS_LABELS } from '@/lib/enum-labels';
import type { MeterType, PropertySummary, TariffBasis, UtilityTariff } from '@/lib/api/types';

export type TariffFormState = { mode: 'create' } | { mode: 'edit'; tariff: UtilityTariff } | null;

export interface TariffFormDialogProps {
  state: TariffFormState;
  properties: PropertySummary[];
  onClose: () => void;
}

interface FormValues {
  propertyId: string;
  meterType: MeterType | '';
  basis: TariffBasis;
  label: string;
  unitPriceAmount: number | null;
  flatAmount: number | null;
  standingChargeAmount: number | null;
  minimumAmount: number | null;
  measurementUnit: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const EMPTY_VALUES: FormValues = {
  propertyId: 'GLOBAL',
  meterType: '',
  basis: 'PER_UNIT_CONSUMED',
  label: '',
  unitPriceAmount: null,
  flatAmount: null,
  standingChargeAmount: null,
  minimumAmount: null,
  measurementUnit: '',
  effectiveFrom: '',
  effectiveTo: '',
};

function valuesFromTariff(tariff: UtilityTariff): FormValues {
  return {
    propertyId: tariff.propertyId ?? 'GLOBAL',
    meterType: tariff.meterType,
    basis: tariff.basis ?? 'PER_UNIT_CONSUMED',
    label: tariff.label,
    unitPriceAmount: tariff.unitPriceAmount ?? null,
    flatAmount: tariff.flatAmount ?? null,
    standingChargeAmount: tariff.standingChargeAmount ?? null,
    minimumAmount: tariff.minimumAmount ?? null,
    measurementUnit: tariff.measurementUnit ?? '',
    effectiveFrom: tariff.effectiveFrom,
    effectiveTo: tariff.effectiveTo ?? '',
  };
}

/**
 * Création/modification d'un tarif — réservé au rôle OWNER (le bouton qui
 * ouvre ce dialogue n'est rendu par la page appelante que pour ce rôle).
 */
export function TariffFormDialog({ state, properties, onClose }: TariffFormDialogProps) {
  const isEdit = state?.mode === 'edit';
  const [values, setValues] = React.useState<FormValues>(EMPTY_VALUES);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state?.mode === 'edit') {
      setValues(valuesFromTariff(state.tariff));
    } else if (state?.mode === 'create') {
      setValues(EMPTY_VALUES);
    }
    setError(null);
  }, [state]);

  const createTariff = useCreateUtilityTariff();
  const updateTariff = useUpdateUtilityTariff(isEdit ? state.tariff.id : '');
  const isPending = createTariff.isPending || updateTariff.isPending;

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.meterType) {
      setError('Sélectionnez un type de compteur.');
      return;
    }
    if (!values.label.trim()) {
      setError('Le libellé est obligatoire.');
      return;
    }
    if (!values.effectiveFrom) {
      setError('La date de début de validité est obligatoire.');
      return;
    }
    const body = {
      propertyId: values.propertyId === 'GLOBAL' ? undefined : values.propertyId,
      meterType: values.meterType,
      basis: values.basis,
      label: values.label.trim(),
      unitPriceAmount: values.unitPriceAmount ?? undefined,
      flatAmount: values.flatAmount ?? undefined,
      standingChargeAmount: values.standingChargeAmount ?? undefined,
      minimumAmount: values.minimumAmount ?? undefined,
      measurementUnit: values.measurementUnit.trim() || undefined,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || undefined,
    };
    try {
      if (isEdit) {
        await updateTariff.mutateAsync(body);
        toast.success('Tarif mis à jour.');
      } else {
        await createTariff.mutateAsync(body);
        toast.success('Tarif créé.');
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={state !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le tarif' : 'Nouveau tarif'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tariff-property">Bien</Label>
              <Select value={values.propertyId} onValueChange={(v) => setField('propertyId', v)}>
                <SelectTrigger id="tariff-property">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">Grille globale (tous biens)</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tariff-meter-type">Type de compteur</Label>
              <EnumSelect
                id="tariff-meter-type"
                value={values.meterType}
                onValueChange={(v) => setField('meterType', v)}
                labels={METER_TYPE_LABELS}
                placeholder="Sélectionnez un type"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tariff-label">Libellé</Label>
            <Input
              id="tariff-label"
              value={values.label}
              onChange={(e) => setField('label', e.target.value)}
              placeholder="Eau LCDE — Résidence Mpila"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tariff-basis">Base tarifaire</Label>
            <EnumSelect
              id="tariff-basis"
              value={values.basis}
              onValueChange={(v) => setField('basis', v)}
              labels={TARIFF_BASIS_LABELS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tariff-unit-price">Prix unitaire / forfait</Label>
              <MoneyInput
                id="tariff-unit-price"
                value={
                  values.basis === 'FLAT_MONTHLY' || values.basis === 'PER_OCCUPANT'
                    ? values.flatAmount
                    : values.unitPriceAmount
                }
                onValueChange={(v) =>
                  values.basis === 'FLAT_MONTHLY' || values.basis === 'PER_OCCUPANT'
                    ? setField('flatAmount', v)
                    : setField('unitPriceAmount', v)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tariff-measurement-unit">Unité de mesure</Label>
              <Input
                id="tariff-measurement-unit"
                value={values.measurementUnit}
                onChange={(e) => setField('measurementUnit', e.target.value)}
                placeholder="m3, kWh…"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tariff-standing-charge">Abonnement fixe</Label>
              <MoneyInput
                id="tariff-standing-charge"
                value={values.standingChargeAmount}
                onValueChange={(v) => setField('standingChargeAmount', v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tariff-minimum">Minimum de facturation</Label>
              <MoneyInput
                id="tariff-minimum"
                value={values.minimumAmount}
                onValueChange={(v) => setField('minimumAmount', v)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tariff-effective-from">Valide à partir du</Label>
              <Input
                id="tariff-effective-from"
                type="date"
                value={values.effectiveFrom}
                onChange={(e) => setField('effectiveFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tariff-effective-to">Valide jusqu&apos;au (optionnel)</Label>
              <Input
                id="tariff-effective-to"
                type="date"
                value={values.effectiveTo}
                onChange={(e) => setField('effectiveTo', e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le tarif'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
