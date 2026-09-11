'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/business/empty-state';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useUnits } from '@/lib/api/hooks/use-units';
import { TenantPicker } from './tenant-picker';
import type { WizardData, WizardErrors } from './wizard-types';

export interface Step1Props {
  data: WizardData;
  errors: WizardErrors;
  onChange: (patch: Partial<WizardData>) => void;
}

export function Step1UnitTenant({ data, errors, onChange }: Step1Props) {
  const { data: properties, isLoading: loadingProperties } = useProperties({ limit: 100 });
  const { data: units, isLoading: loadingUnits } = useUnits({
    propertyId: data.propertyId || undefined,
    status: 'AVAILABLE',
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Immeuble et lot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propertyId">Immeuble</Label>
            <Select
              value={data.propertyId || undefined}
              onValueChange={(value) => onChange({ propertyId: value, unitId: '', unitCode: '' })}
              disabled={loadingProperties}
            >
              <SelectTrigger id="propertyId">
                <SelectValue placeholder="Sélectionnez un immeuble" />
              </SelectTrigger>
              <SelectContent>
                {(properties?.items ?? []).map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.propertyId ? (
              <p className="text-sm font-medium text-destructive">{errors.propertyId}</p>
            ) : null}
          </div>

          {data.propertyId ? (
            loadingUnits ? null : (units?.items.length ?? 0) === 0 ? (
              <EmptyState
                title="Aucun lot disponible"
                description="Tous les lots de cet immeuble sont déjà occupés, réservés ou indisponibles."
              />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="unitId">Lot disponible</Label>
                <Select
                  value={data.unitId || undefined}
                  onValueChange={(value) => {
                    const unit = units?.items.find((u) => u.id === value);
                    onChange({
                      unitId: value,
                      unitCode: unit?.code ?? '',
                      depositMonths: unit?.depositMonths ?? 2,
                      rentAmount: data.rentAmount ?? unit?.baseRentAmount ?? null,
                      chargesAmount: data.chargesAmount ?? unit?.baseChargesAmount ?? null,
                    });
                  }}
                >
                  <SelectTrigger id="unitId">
                    <SelectValue placeholder="Sélectionnez un lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {(units?.items ?? []).map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.code}
                        {unit.label ? ` — ${unit.label}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unitId ? (
                  <p className="text-sm font-medium text-destructive">{errors.unitId}</p>
                ) : null}
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Locataire principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.tenantId ? (
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <span className="text-sm font-medium">{data.tenantName}</span>
              <button
                type="button"
                onClick={() => onChange({ tenantId: '', tenantName: '' })}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Changer
              </button>
            </div>
          ) : (
            <TenantPicker
              onSelect={(tenant) =>
                onChange({ tenantId: tenant.id, tenantName: tenant.displayName })
              }
            />
          )}
          {errors.tenantId ? (
            <p className="text-sm font-medium text-destructive">{errors.tenantId}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Date de début</Label>
            <Input
              id="startDate"
              type="date"
              value={data.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
            />
            {errors.startDate ? (
              <p className="text-sm font-medium text-destructive">{errors.startDate}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Date de fin (optionnelle)</Label>
            <Input
              id="endDate"
              type="date"
              value={data.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
