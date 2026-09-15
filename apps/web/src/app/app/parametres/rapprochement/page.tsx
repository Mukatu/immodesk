'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyInput } from '@/components/business/money-input';
import { PageHeader } from '@/components/business/page-header';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useReconciliationSettings,
  useUpdateReconciliationSettings,
} from '@/lib/api/hooks/use-reconciliation-settings';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

const schema = z.object({
  suggestionThreshold: z.coerce.number().int().min(50).max(95),
  dateWindowDays: z.coerce.number().int().min(0).max(90),
  amountTolerancePercent: z.coerce.number().min(0).max(100),
  autoConfirmExact: z.boolean(),
  checkClearingAlertDays: z.coerce.number().int().min(0).max(90),
  bounceFeeAmount: z.coerce.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

/**
 * Paramètres de rapprochement bancaire (phase 6) : seuil de suggestion,
 * fenêtre de dates, tolérance de montant, confirmation automatique des
 * correspondances exactes, délai d'alerte des chèques déposés et frais de
 * rejet appliqués sur la prochaine facture du locataire (jamais sur la
 * facture d'origine).
 */
export default function ParametresRapprochementPage() {
  const { currentOrganizationId } = useAuth();
  const { data: settings, isLoading } = useReconciliationSettings(currentOrganizationId);
  const updateSettings = useUpdateReconciliationSettings(currentOrganizationId ?? '');
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: settings
      ? {
          suggestionThreshold: settings.suggestionThreshold,
          dateWindowDays: settings.dateWindowDays,
          amountTolerancePercent: settings.amountTolerancePercent,
          autoConfirmExact: settings.autoConfirmExact,
          checkClearingAlertDays: settings.checkClearingAlertDays,
          bounceFeeAmount: settings.bounceFeeAmount,
        }
      : undefined,
  });
  const { register, watch, setValue, handleSubmit, formState } = form;

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      await updateSettings.mutateAsync(values);
      toast.success('Paramètres de rapprochement mis à jour.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rapprochement bancaire"
        description="Réglages du moteur de suggestion de rapprochement et des chèques."
      />

      <Card>
        <CardHeader>
          <CardTitle>Suggestions de rapprochement</CardTitle>
          <CardDescription>
            Contrôlent la sensibilité du rapprochement automatique des lignes de relevé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || !settings ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="suggestionThreshold">
                    Seuil de suggestion (%, entre 50 et 95)
                  </Label>
                  <Input
                    id="suggestionThreshold"
                    type="number"
                    min={50}
                    max={95}
                    {...register('suggestionThreshold')}
                  />
                  {formState.errors.suggestionThreshold ? (
                    <p role="alert" className="text-sm text-destructive">
                      Doit être compris entre 50 et 95.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateWindowDays">Fenêtre de dates (jours)</Label>
                  <Input
                    id="dateWindowDays"
                    type="number"
                    min={0}
                    max={90}
                    {...register('dateWindowDays')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountTolerancePercent">Tolérance de montant (%)</Label>
                  <Input
                    id="amountTolerancePercent"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    {...register('amountTolerancePercent')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkClearingAlertDays">
                    Délai d’alerte des chèques déposés (jours)
                  </Label>
                  <Input
                    id="checkClearingAlertDays"
                    type="number"
                    min={0}
                    max={90}
                    {...register('checkClearingAlertDays')}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={watch('autoConfirmExact')}
                  onChange={(e) => setValue('autoConfirmExact', e.target.checked)}
                />
                Confirmer automatiquement les rapprochements exacts
              </label>

              <div className="max-w-xs space-y-2">
                <Label htmlFor="bounceFeeAmount">Frais de rejet de chèque</Label>
                <MoneyInput
                  id="bounceFeeAmount"
                  value={watch('bounceFeeAmount')}
                  onValueChange={(value) => setValue('bounceFeeAmount', value ?? 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Appliqués sur la prochaine facture du locataire, jamais sur la facture réglée par
                  le chèque rejeté.
                </p>
              </div>

              {error ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
