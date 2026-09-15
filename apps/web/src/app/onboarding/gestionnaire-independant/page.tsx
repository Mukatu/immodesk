'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/business/page-header';
import { PhoneInput } from '@/components/business/phone-input';
import { toE164Congo } from '@/lib/phone';
import { useAuth } from '@/lib/auth/auth-context';
import { useOnboardIndependentManager } from '@/lib/api/hooks/use-onboarding';
import { setCurrentOrganizationId } from '@/lib/api/token-store';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

/** Onboarding du gestionnaire indépendant : organisation, bailleur, bien et mandat en moins de dix minutes. */
export default function OnboardingGestionnaireIndependantPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const onboard = useOnboardIndependentManager();

  const [organizationLegalName, setOrganizationLegalName] = React.useState('');
  const [organizationCity, setOrganizationCity] = React.useState('Brazzaville');
  const [organizationPhone, setOrganizationPhone] = React.useState('');
  const [landlordFirstName, setLandlordFirstName] = React.useState('');
  const [landlordLastName, setLandlordLastName] = React.useState('');
  const [landlordPhone, setLandlordPhone] = React.useState('');
  const [propertyName, setPropertyName] = React.useState('');
  const [propertyAddressLine, setPropertyAddressLine] = React.useState('');
  const [propertyCity, setPropertyCity] = React.useState('Brazzaville');
  const [commissionRatePercent, setCommissionRatePercent] = React.useState('10');
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const orgPhone = toE164Congo(organizationPhone);
    const ownerPhone = toE164Congo(landlordPhone);
    if (
      !organizationLegalName.trim() ||
      !orgPhone ||
      !landlordFirstName.trim() ||
      !landlordLastName.trim() ||
      !ownerPhone ||
      !propertyName.trim() ||
      !propertyAddressLine.trim()
    ) {
      setError('Merci de compléter tous les champs requis.');
      return;
    }
    try {
      const result = await onboard.mutateAsync({
        organizationLegalName: organizationLegalName.trim(),
        organizationCity,
        organizationContactPhone: orgPhone,
        landlordFirstName: landlordFirstName.trim(),
        landlordLastName: landlordLastName.trim(),
        landlordPhone: ownerPhone,
        propertyName: propertyName.trim(),
        propertyAddressLine: propertyAddressLine.trim(),
        propertyCity,
        commissionRateBps: Math.round(Number(commissionRatePercent) * 100),
      });
      setCurrentOrganizationId(result.organization.id);
      await refresh();
      router.push(`/app/gerance/mandats/${result.mandate.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <main id="contenu-principal" className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        title="Démarrer en tant que gestionnaire indépendant"
        description="Votre organisation, votre premier bailleur, son bien et le mandat de gestion, en une seule étape."
      />

      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Votre activité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nom de votre activité</Label>
              <Input
                id="org-name"
                placeholder="Ex. Gestion Mavoungou"
                value={organizationLegalName}
                onChange={(e) => setOrganizationLegalName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-city">Ville</Label>
                <Input
                  id="org-city"
                  value={organizationCity}
                  onChange={(e) => setOrganizationCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-phone">Votre téléphone</Label>
                <PhoneInput
                  id="org-phone"
                  value={organizationPhone}
                  onValueChange={setOrganizationPhone}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Votre premier bailleur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="landlord-first-name">Prénom</Label>
                <Input
                  id="landlord-first-name"
                  value={landlordFirstName}
                  onChange={(e) => setLandlordFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landlord-last-name">Nom</Label>
                <Input
                  id="landlord-last-name"
                  value={landlordLastName}
                  onChange={(e) => setLandlordLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="landlord-phone">Téléphone du bailleur</Label>
              <PhoneInput
                id="landlord-phone"
                value={landlordPhone}
                onValueChange={setLandlordPhone}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son premier bien</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property-name">Nom du bien</Label>
              <Input
                id="property-name"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-address">Adresse</Label>
              <Input
                id="property-address"
                value={propertyAddressLine}
                onChange={(e) => setPropertyAddressLine(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property-city">Ville</Label>
                <Input
                  id="property-city"
                  value={propertyCity}
                  onChange={(e) => setPropertyCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission-rate">Commission de gestion (%)</Label>
                <Input
                  id="commission-rate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={commissionRatePercent}
                  onChange={(e) => setCommissionRatePercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Pré-rempli à 10 %, modifiable.</p>
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
          <Button type="button" onClick={handleSubmit} disabled={onboard.isPending}>
            {onboard.isPending ? 'Création…' : 'Créer mon espace de gestion'}
          </Button>
        </div>
      </div>
    </main>
  );
}
