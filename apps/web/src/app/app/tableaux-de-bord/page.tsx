'use client';

import * as React from 'react';

import { PageHeader } from '@/components/business/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useLandlords } from '@/lib/api/hooks/use-landlords';
import { CollectionRateWidget } from './_components/collection-rate-widget';
import { ArrearsWidget } from './_components/arrears-widget';
import { VacancyWidget } from './_components/vacancy-widget';
import { PaymentMethodsWidget } from './_components/payment-methods-widget';

function firstDayOfMonthsAgo(monthsAgo: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return date.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Quatre tableaux de bord de recouvrement (phase 9), tous en lecture seule et
 * filtrables par période, immeuble et bailleur — accessibles au rôle VIEWER
 * (l'autorisation réelle reste côté API, cf. README « Authentification »).
 */
export default function TableauxDeBordPage() {
  const [from, setFrom] = React.useState(firstDayOfMonthsAgo(5));
  const [to, setTo] = React.useState(today());
  const [propertyId, setPropertyId] = React.useState('ALL');
  const [landlordId, setLandlordId] = React.useState('ALL');

  const { data: propertiesData } = useProperties({ limit: 100 });
  const { data: landlordsData } = useLandlords({ limit: 100 });

  const filters = {
    from,
    to,
    propertyId: propertyId === 'ALL' ? undefined : propertyId,
    landlordId: landlordId === 'ALL' ? undefined : landlordId,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableaux de bord"
        description="Recouvrement, impayés, vacance locative et encaissements par mode de paiement."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-from">Du</Label>
          <Input
            id="dashboard-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-to">Au</Label>
          <Input id="dashboard-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-property">Immeuble</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger id="dashboard-property" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les immeubles</SelectItem>
              {(propertiesData?.items ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dashboard-landlord">Bailleur</Label>
          <Select value={landlordId} onValueChange={setLandlordId}>
            <SelectTrigger id="dashboard-landlord" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les bailleurs</SelectItem>
              {(landlordsData?.items ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CollectionRateWidget filters={filters} />
        <ArrearsWidget
          filters={{ asOf: to, propertyId: filters.propertyId, landlordId: filters.landlordId }}
        />
        <VacancyWidget filters={{ asOf: to, propertyId: filters.propertyId }} />
        <PaymentMethodsWidget filters={{ from, to, propertyId: filters.propertyId }} />
      </div>
    </div>
  );
}
