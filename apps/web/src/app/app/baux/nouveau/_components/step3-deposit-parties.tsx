'use client';

import { X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PhoneDisplay } from '@/components/business/phone-display';
import { useTenant } from '@/lib/api/hooks/use-tenants';
import { TenantPicker } from './tenant-picker';
import type { WizardData } from './wizard-types';

export interface Step3Props {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}

export function Step3DepositParties({ data, onChange }: Step3Props) {
  const { data: tenant, isLoading } = useTenant(data.tenantId || null);
  const guarantors = tenant?.guarantors ?? [];

  function toggleGuarantor(guarantorId: string, checked: boolean) {
    onChange({
      includedGuarantorIds: checked
        ? [...data.includedGuarantorIds, guarantorId]
        : data.includedGuarantorIds.filter((id) => id !== guarantorId),
    });
  }

  function addCoTenant(tenantOption: { id: string; displayName: string }) {
    if (data.coTenants.some((c) => c.id === tenantOption.id)) return;
    onChange({ coTenants: [...data.coTenants, tenantOption] });
  }

  function removeCoTenant(id: string) {
    onChange({ coTenants: data.coTenants.filter((c) => c.id !== id) });
  }

  const excludeIds = [data.tenantId, ...data.coTenants.map((c) => c.id)];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dépôt de garantie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ce montant sera demandé au locataire et suivi dans /app/depots dès l&apos;activation du
            bail.
          </p>
          <p className="mt-2 text-xl font-semibold">
            {data.depositAmount !== null ? <MoneyXaf amount={data.depositAmount} /> : '—'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Colocataires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.coTenants.length > 0 ? (
            <ul className="space-y-2">
              {data.coTenants.map((coTenant) => (
                <li
                  key={coTenant.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <span className="text-sm font-medium">{coTenant.displayName}</span>
                  <button
                    type="button"
                    onClick={() => removeCoTenant(coTenant.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Retirer ${coTenant.displayName}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <TenantPicker
            onSelect={addCoTenant}
            excludeIds={excludeIds}
            placeholder="Rechercher un colocataire à ajouter"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Garants du locataire principal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : guarantors.length === 0 ? (
            <EmptyState
              title="Aucun garant enregistré"
              description="Ajoutez un garant depuis la fiche de ce locataire, puis revenez ici pour l'inclure comme partie du bail."
            />
          ) : (
            <ul className="space-y-2">
              {guarantors.map((guarantor) => (
                <li
                  key={guarantor.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <Checkbox
                    id={`guarantor-${guarantor.id}`}
                    checked={data.includedGuarantorIds.includes(guarantor.id)}
                    onChange={(e) => toggleGuarantor(guarantor.id, e.target.checked)}
                  />
                  <Label
                    htmlFor={`guarantor-${guarantor.id}`}
                    className="flex flex-col gap-0.5 font-normal"
                  >
                    <span className="text-sm font-medium">{guarantor.displayName}</span>
                    <PhoneDisplay phone={guarantor.primaryPhone} />
                  </Label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
