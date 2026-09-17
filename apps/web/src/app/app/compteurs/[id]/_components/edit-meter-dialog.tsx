'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
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
import { EnumSelect } from '@/components/business/enum-select';
import { useUpdateMeter } from '@/lib/api/hooks/use-meters';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { ApiErrorCode } from '@/lib/api/types';
import { METER_TYPE_LABELS } from '@/lib/enum-labels';
import type { Meter, MeterType } from '@/lib/api/types';

export interface EditMeterDialogProps {
  meter: Meter;
}

/** Modification des attributs d'un compteur existant (`PATCH /v1/meters/{id}`). */
export function EditMeterDialog({ meter }: EditMeterDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [meterType, setMeterType] = React.useState<MeterType>(meter.meterType);
  const [serialNumber, setSerialNumber] = React.useState(meter.serialNumber);
  const [digitsCount, setDigitsCount] = React.useState(String(meter.digitsCount ?? 5));
  const [isShared, setIsShared] = React.useState(meter.isShared ?? false);
  const [sharedRatioPercent, setSharedRatioPercent] = React.useState(
    meter.sharedRatioBps ? String(meter.sharedRatioBps / 100) : '',
  );
  const [isPrepaid, setIsPrepaid] = React.useState(meter.isPrepaid ?? false);
  const [error, setError] = React.useState<string | null>(null);

  const updateMeter = useUpdateMeter(meter.id);

  function resetToMeter() {
    setMeterType(meter.meterType);
    setSerialNumber(meter.serialNumber);
    setDigitsCount(String(meter.digitsCount ?? 5));
    setIsShared(meter.isShared ?? false);
    setSharedRatioPercent(meter.sharedRatioBps ? String(meter.sharedRatioBps / 100) : '');
    setIsPrepaid(meter.isPrepaid ?? false);
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    const digits = Number(digitsCount);
    const ratioPercent = Number(sharedRatioPercent);
    if (!serialNumber.trim() || !Number.isFinite(digits) || digits <= 0) {
      setError('Numéro de série et nombre de chiffres sont requis.');
      return;
    }
    if (isShared && (!sharedRatioPercent || !Number.isFinite(ratioPercent) || ratioPercent <= 0)) {
      setError('Indiquez la quote-part du compteur partagé.');
      return;
    }
    try {
      await updateMeter.mutateAsync({
        meterType,
        serialNumber: serialNumber.trim(),
        digitsCount: digits,
        isShared,
        sharedRatioBps: isShared ? Math.round(ratioPercent * 100) : undefined,
        isPrepaid,
      });
      toast.success('Compteur mis à jour.');
      setOpen(false);
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
        if (!next) resetToMeter();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil className="mr-2 size-4" aria-hidden="true" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le compteur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-meter-type">Type</Label>
              <EnumSelect
                id="edit-meter-type"
                value={meterType}
                onValueChange={setMeterType}
                labels={METER_TYPE_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-meter-serial">Numéro de série</Label>
              <Input
                id="edit-meter-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-meter-digits">Nombre de chiffres du compteur</Label>
            <Input
              id="edit-meter-digits"
              type="number"
              min={1}
              value={digitsCount}
              onChange={(e) => setDigitsCount(e.target.value)}
              className="w-32"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrepaid} onChange={(e) => setIsPrepaid(e.target.checked)} />
            Prépayé
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isShared} onChange={(e) => setIsShared(e.target.checked)} />
              Compteur partagé
            </label>
            {isShared ? (
              <div className="space-y-2 pl-6">
                <Label htmlFor="edit-meter-shared-ratio">Quote-part (%)</Label>
                <Input
                  id="edit-meter-shared-ratio"
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
          <Button type="button" onClick={handleSubmit} disabled={updateMeter.isPending}>
            {updateMeter.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
