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
import { useLandlords } from '@/lib/api/hooks/use-landlords';
import { useOnboardingFirstProperty } from '@/lib/api/hooks/use-onboarding-wizard';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface StepFirstPropertyProps {
  organizationId: string;
  onDone: () => void;
  onSkip: () => void;
}

/** Étape « premier bien » : mêmes champs que `PropertyInput` (phases 1-2). */
export function StepFirstProperty({ organizationId, onDone, onSkip }: StepFirstPropertyProps) {
  const { data, isLoading } = useLandlords({ limit: 50 });
  const landlords = data?.items ?? [];
  const createProperty = useOnboardingFirstProperty(organizationId);

  const [landlordId, setLandlordId] = React.useState('');
  const [name, setName] = React.useState('');
  const [addressLine, setAddressLine] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [city, setCity] = React.useState('Brazzaville');
  const [error, setError] = React.useState<string | null>(null);

  if (isLoading) return null;

  if (landlords.length === 0) {
    return (
      <EmptyState
        title="Aucun bailleur"
        description="Créez d'abord un bailleur pour pouvoir lui rattacher un bien."
        action={
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/app/bailleurs">Créer un bailleur</Link>
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
    if (!landlordId || !name.trim() || !addressLine.trim() || !district.trim()) {
      setError('Merci de compléter tous les champs requis.');
      return;
    }
    setError(null);
    try {
      await createProperty.mutateAsync({
        landlordId,
        name: name.trim(),
        addressLine: addressLine.trim(),
        district: district.trim(),
        city: city.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="first-property-landlord">Bailleur</Label>
        <Select value={landlordId} onValueChange={setLandlordId}>
          <SelectTrigger id="first-property-landlord">
            <SelectValue placeholder="Sélectionnez un bailleur" />
          </SelectTrigger>
          <SelectContent>
            {landlords.map((landlord) => (
              <SelectItem key={landlord.id} value={landlord.id}>
                {landlord.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="first-property-name">Nom du bien</Label>
        <Input id="first-property-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="first-property-address">Adresse</Label>
        <Input
          id="first-property-address"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-property-district">Quartier / arrondissement</Label>
          <Input
            id="first-property-district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="first-property-city">Ville</Label>
          <Input id="first-property-city" value={city} onChange={(e) => setCity(e.target.value)} />
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
        <Button type="submit" disabled={createProperty.isPending}>
          {createProperty.isPending ? 'Création…' : 'Créer le bien'}
        </Button>
      </div>
    </form>
  );
}
