'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PageHeader } from '@/components/business/page-header';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useLandlords } from '@/lib/api/hooks/use-landlords';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useCreateMandate } from '@/lib/api/hooks/use-mandates';
import { MANDATE_SCOPE_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { MandateScope } from '@/lib/api/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NouveauMandatPage() {
  const router = useRouter();
  const [landlordId, setLandlordId] = React.useState('');
  const [propertyIds, setPropertyIds] = React.useState<string[]>([]);
  const [scope, setScope] = React.useState<MandateScope>('FULL_MANAGEMENT');
  const [startDate, setStartDate] = React.useState(today());
  const [commissionRatePercent, setCommissionRatePercent] = React.useState('10');
  const [vatRatePercent, setVatRatePercent] = React.useState('18');
  const [payoutDay, setPayoutDay] = React.useState('10');
  const [error, setError] = React.useState<string | null>(null);

  const { data: landlords } = useLandlords({ limit: 100 });
  const { data: properties } = useProperties({ landlordId, limit: 100 });
  const createMandate = useCreateMandate();

  function toggleProperty(id: string) {
    setPropertyIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit() {
    setError(null);
    if (!landlordId || propertyIds.length === 0 || !startDate) {
      setError('Bailleur, au moins un bien et une date de début sont requis.');
      return;
    }
    try {
      const mandate = await createMandate.mutateAsync({
        landlordId,
        propertyIds,
        scope,
        startDate,
        commissionBasis: 'RATE_BPS_ON_RENT_COLLECTED',
        commissionRateBps: Math.round(Number(commissionRatePercent) * 100),
        vatRateBps: Math.round(Number(vatRatePercent) * 100),
        payoutDay: Number(payoutDay),
      });
      router.push(`/app/gerance/mandats/${mandate.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nouveau mandat de gestion"
        description="Bailleur, biens rattachés et conditions de commission."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bailleur et biens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mandate-landlord">Bailleur</Label>
            <Select
              value={landlordId || undefined}
              onValueChange={(v) => {
                setLandlordId(v);
                setPropertyIds([]);
              }}
            >
              <SelectTrigger id="mandate-landlord">
                <SelectValue placeholder="Choisir un bailleur" />
              </SelectTrigger>
              <SelectContent>
                {(landlords?.items ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {landlordId ? (
            <div className="space-y-2">
              <Label>Biens à rattacher</Label>
              {(properties?.items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Ce bailleur n&apos;a aucun bien.</p>
              ) : (
                <div className="space-y-2">
                  {(properties?.items ?? []).map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={propertyIds.includes(p.id)}
                        onChange={() => toggleProperty(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Périmètre et commission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mandate-scope">Périmètre du mandat</Label>
            <EnumSelect
              id="mandate-scope"
              value={scope}
              onValueChange={setScope}
              labels={MANDATE_SCOPE_LABELS}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mandate-start">Date de début</Label>
              <Input
                id="mandate-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandate-payout-day">Jour de reversement</Label>
              <Input
                id="mandate-payout-day"
                type="number"
                min={1}
                max={28}
                value={payoutDay}
                onChange={(e) => setPayoutDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandate-commission-rate">Commission sur loyer encaissé (%)</Label>
              <Input
                id="mandate-commission-rate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={commissionRatePercent}
                onChange={(e) => setCommissionRatePercent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mandate-vat-rate">TVA sur commission (%)</Label>
              <Input
                id="mandate-vat-rate"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={vatRatePercent}
                onChange={(e) => setVatRatePercent(e.target.value)}
              />
            </div>
          </div>
          {commissionRatePercent ? (
            <p className="text-sm text-muted-foreground">
              Exemple sur un loyer encaissé de{' '}
              <MoneyXaf amount={100_000} className="font-medium text-foreground" /> : commission de{' '}
              <MoneyXaf
                amount={Math.round((100_000 * Number(commissionRatePercent)) / 100)}
                className="font-medium text-foreground"
              />
              .
            </p>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={createMandate.isPending}>
          {createMandate.isPending ? 'Création…' : 'Créer le mandat'}
        </Button>
      </div>
    </div>
  );
}
