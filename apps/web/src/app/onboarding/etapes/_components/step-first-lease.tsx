'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
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
import { MoneyInput } from '@/components/business/money-input';
import { useUnits } from '@/lib/api/hooks/use-units';
import { useTenants } from '@/lib/api/hooks/use-tenants';
import { useOnboardingFirstLease } from '@/lib/api/hooks/use-onboarding-wizard';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface StepFirstLeaseProps {
  organizationId: string;
  onDone: () => void;
  onSkip: () => void;
}

/** Étape « premier bail » : mêmes champs que `LeaseInput` (phase 2). */
export function StepFirstLease({ organizationId, onDone, onSkip }: StepFirstLeaseProps) {
  const { data: unitsData, isLoading: loadingUnits } = useUnits({ limit: 50 });
  const { data: tenantsData, isLoading: loadingTenants } = useTenants({ limit: 50 });
  const units = unitsData?.items ?? [];
  const tenants = tenantsData?.items ?? [];
  const createLease = useOnboardingFirstLease(organizationId);

  const [unitId, setUnitId] = React.useState('');
  const [tenantId, setTenantId] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [rentAmount, setRentAmount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (loadingUnits || loadingTenants) return null;

  if (units.length === 0 || tenants.length === 0) {
    return (
      <EmptyState
        title="Lot ou locataire manquant"
        description="Créez d'abord un lot et un locataire pour pouvoir signer un premier bail."
        action={
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/app/immeubles">Créer un lot</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/locataires">Créer un locataire</Link>
            </Button>
            <Button type="button" variant="ghost" onClick={onSkip}>
              Passer cette étape
            </Button>
          </div>
        }
      />
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!unitId || !tenantId || !startDate || !rentAmount) {
      setError('Merci de compléter tous les champs requis.');
      return;
    }
    setError(null);
    try {
      await createLease.mutateAsync({
        unitId,
        primaryTenantId: tenantId,
        startDate,
        rentAmount,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-lease-unit">Lot</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger id="first-lease-unit">
              <SelectValue placeholder="Sélectionnez un lot" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="first-lease-tenant">Locataire</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger id="first-lease-tenant">
              <SelectValue placeholder="Sélectionnez un locataire" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-lease-start">Date de début</Label>
          <Input
            id="first-lease-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="first-lease-rent">Loyer mensuel</Label>
          <MoneyInput id="first-lease-rent" value={rentAmount} onValueChange={setRentAmount} />
        </div>
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Passer cette étape
        </Button>
        <Button type="submit" disabled={createLease.isPending}>
          {createLease.isPending ? 'Création…' : 'Créer le bail'}
        </Button>
      </div>
    </form>
  );
}
