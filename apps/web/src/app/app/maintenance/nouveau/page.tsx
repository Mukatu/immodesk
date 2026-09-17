'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EnumSelect } from '@/components/business/enum-select';
import { PageHeader } from '@/components/business/page-header';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { useCreateMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { MAINTENANCE_PRIORITY_LABELS, MAINTENANCE_REPORTER_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { MaintenancePriority, MaintenanceReporter } from '@/lib/api/types';

export default function NouvelleMaintenancePage() {
  const router = useRouter();
  const [propertyId, setPropertyId] = React.useState('');
  const [unitId, setUnitId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<MaintenancePriority>('NORMAL');
  const [reporterType, setReporterType] = React.useState<MaintenanceReporter>('MANAGER');
  const [error, setError] = React.useState<string | null>(null);

  const { data: properties } = useProperties({ limit: 100 });
  const { data: units } = useUnits({ propertyId: propertyId || undefined, limit: 200 });
  const createMaintenanceRequest = useCreateMaintenanceRequest();

  function handlePropertyChange(next: string) {
    setPropertyId(next);
    setUnitId('');
  }

  async function handleSubmit() {
    setError(null);
    if (!unitId || !title.trim() || !description.trim()) {
      setError('Le lot, l’objet et la description sont requis.');
      return;
    }
    try {
      const created = await createMaintenanceRequest.mutateAsync({
        propertyId,
        unitId,
        title: title.trim(),
        description: description.trim(),
        priority,
        reporterType,
      });
      router.push(`/app/maintenance/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Nouvelle demande de maintenance"
        description="Lot concerné, objet, description, priorité et origine du signalement."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détails de la demande</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-property">Immeuble</Label>
              <Select value={propertyId || undefined} onValueChange={handlePropertyChange}>
                <SelectTrigger id="maintenance-property">
                  <SelectValue placeholder="Choisir un immeuble" />
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
              <Label htmlFor="maintenance-unit">Lot</Label>
              <Select value={unitId || undefined} onValueChange={setUnitId} disabled={!propertyId}>
                <SelectTrigger id="maintenance-unit">
                  <SelectValue placeholder="Choisir un lot" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-title">Objet</Label>
            <Input
              id="maintenance-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenance-description">Description</Label>
            <Textarea
              id="maintenance-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-priority">Priorité</Label>
              <EnumSelect
                id="maintenance-priority"
                value={priority}
                onValueChange={setPriority}
                labels={MAINTENANCE_PRIORITY_LABELS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-reporter">Origine du signalement</Label>
              <EnumSelect
                id="maintenance-reporter"
                value={reporterType}
                onValueChange={setReporterType}
                labels={MAINTENANCE_REPORTER_LABELS}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={createMaintenanceRequest.isPending}>
          {createMaintenanceRequest.isPending ? 'Création…' : 'Signaler la demande'}
        </Button>
      </div>
    </div>
  );
}
