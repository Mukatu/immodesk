'use client';

import * as React from 'react';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { useCreateMeter } from '@/lib/api/hooks/use-meters';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { ApiErrorCode } from '@/lib/api/types';
import { METER_TYPE_LABELS } from '@/lib/enum-labels';
import type { MeterType } from '@/lib/api/types';

const DEFAULT_DIGITS_COUNT = 5;

export function CreateMeterDialog() {
  const [open, setOpen] = React.useState(false);
  const [propertyId, setPropertyId] = React.useState('');
  const [unitId, setUnitId] = React.useState('');
  const [meterType, setMeterType] = React.useState<MeterType>('ELECTRICITY_E2C');
  const [serialNumber, setSerialNumber] = React.useState('');
  const [digitsCount, setDigitsCount] = React.useState(String(DEFAULT_DIGITS_COUNT));
  const [isShared, setIsShared] = React.useState(false);
  const [sharedRatioPercent, setSharedRatioPercent] = React.useState('');
  const [isPrepaid, setIsPrepaid] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { data: properties } = useProperties({ limit: 200 });
  const { data: units } = useUnits({ propertyId: propertyId || undefined, limit: 200 });
  const createMeter = useCreateMeter();

  function reset() {
    setPropertyId('');
    setUnitId('');
    setMeterType('ELECTRICITY_E2C');
    setSerialNumber('');
    setDigitsCount(String(DEFAULT_DIGITS_COUNT));
    setIsShared(false);
    setSharedRatioPercent('');
    setIsPrepaid(false);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const digits = Number(digitsCount);
    if (!propertyId || !serialNumber.trim() || !Number.isFinite(digits) || digits <= 0) {
      setError('Bien, numéro de série et nombre de chiffres sont requis.');
      return;
    }
    const ratioPercent = Number(sharedRatioPercent);
    if (isShared && (!sharedRatioPercent || !Number.isFinite(ratioPercent) || ratioPercent <= 0)) {
      setError('Indiquez la quote-part du compteur partagé.');
      return;
    }
    try {
      await createMeter.mutateAsync({
        propertyId,
        unitId: unitId || undefined,
        meterType,
        serialNumber: serialNumber.trim(),
        digitsCount: digits,
        isShared,
        sharedRatioBps: isShared ? Math.round(ratioPercent * 100) : undefined,
        isPrepaid,
      });
      toast.success('Compteur créé.');
      setOpen(false);
      reset();
    } catch (err) {
      if (err instanceof ApiError && err.code === ApiErrorCode.METERS_SERIAL_TAKEN) {
        setError('Ce numéro de série est déjà enregistré.');
      } else {
        setError(err instanceof ApiError ? err.message : genericErrorMessage);
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <PlusCircle className="mr-2 size-4" aria-hidden="true" />
          Nouveau compteur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau compteur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meter-property">Bien</Label>
            <Select
              value={propertyId || undefined}
              onValueChange={(v) => {
                setPropertyId(v);
                setUnitId('');
              }}
            >
              <SelectTrigger id="meter-property">
                <SelectValue placeholder="Choisir un bien" />
              </SelectTrigger>
              <SelectContent>
                {(properties?.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meter-unit">Lot (facultatif)</Label>
            <Select value={unitId || undefined} onValueChange={setUnitId} disabled={!propertyId}>
              <SelectTrigger id="meter-unit">
                <SelectValue placeholder="Compteur commun au bien" />
              </SelectTrigger>
              <SelectContent>
                {(units?.items ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meter-type">Type</Label>
              <EnumSelect
                id="meter-type"
                value={meterType}
                onValueChange={setMeterType}
                labels={METER_TYPE_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meter-serial">Numéro de série</Label>
              <Input
                id="meter-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meter-digits">Nombre de chiffres du compteur</Label>
            <Input
              id="meter-digits"
              type="number"
              min={1}
              value={digitsCount}
              onChange={(e) => setDigitsCount(e.target.value)}
              className="w-32"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrepaid} onChange={(e) => setIsPrepaid(e.target.checked)} />
            <span>
              Prépayé
              <br />
              <span className="text-xs text-muted-foreground">
                Jamais relevé pour refacturation : ses charges sont forfaitaires.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
              Compteur partagé
            </label>
            {isShared ? (
              <div className="space-y-2 pl-6">
                <Label htmlFor="meter-shared-ratio">Quote-part (%)</Label>
                <Input
                  id="meter-shared-ratio"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={sharedRatioPercent}
                  onChange={(e) => setSharedRatioPercent(e.target.value)}
                  className="w-32"
                />
              </div>
            ) : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={createMeter.isPending}>
            {createMeter.isPending ? 'Création…' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
