'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PAYMENT_METHOD_LABELS, RENT_PERIOD_LABELS } from '@/lib/enum-labels';
import type { WizardData, WizardErrors } from './wizard-types';

export interface Step2Props {
  data: WizardData;
  errors: WizardErrors;
  onChange: (patch: Partial<WizardData>) => void;
}

export function Step2Financials({ data, errors, onChange }: Step2Props) {
  React.useEffect(() => {
    if (data.depositManuallyEdited) return;
    const computed = data.rentAmount !== null ? data.rentAmount * data.depositMonths : null;
    if (computed !== data.depositAmount) {
      onChange({ depositAmount: computed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.rentAmount, data.depositMonths, data.depositManuallyEdited]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loyer et charges</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rentAmount">Loyer</Label>
            <MoneyInput
              id="rentAmount"
              value={data.rentAmount}
              onValueChange={(value) => onChange({ rentAmount: value })}
            />
            {errors.rentAmount ? (
              <p className="text-sm font-medium text-destructive">{errors.rentAmount}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="chargesAmount">Charges (optionnel)</Label>
            <MoneyInput
              id="chargesAmount"
              value={data.chargesAmount}
              onValueChange={(value) => onChange({ chargesAmount: value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rentPeriod">Périodicité</Label>
            <EnumSelect
              id="rentPeriod"
              value={data.rentPeriod}
              onValueChange={(value) => onChange({ rentPeriod: value })}
              labels={RENT_PERIOD_LABELS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDueDay">Jour d&apos;échéance</Label>
            <Input
              id="paymentDueDay"
              type="number"
              min={1}
              max={28}
              value={data.paymentDueDay}
              onChange={(e) => onChange({ paymentDueDay: Number(e.target.value) })}
            />
            {errors.paymentDueDay ? (
              <p className="text-sm font-medium text-destructive">{errors.paymentDueDay}</p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="preferredPaymentMethod">Mode de paiement préféré (optionnel)</Label>
            <EnumSelect
              id="preferredPaymentMethod"
              value={data.preferredPaymentMethod}
              onValueChange={(value) => onChange({ preferredPaymentMethod: value })}
              labels={PAYMENT_METHOD_LABELS}
              placeholder="Non précisé"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dépôt de garantie proposé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Calculé automatiquement : {data.depositMonths} mois de loyer.
          </p>
          {data.depositManuallyEdited ? (
            <div className="max-w-xs space-y-2">
              <Label htmlFor="depositAmount">Dépôt de garantie</Label>
              <MoneyInput
                id="depositAmount"
                value={data.depositAmount}
                onValueChange={(value) => onChange({ depositAmount: value })}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xl font-semibold">
                {data.depositAmount !== null ? <MoneyXaf amount={data.depositAmount} /> : '—'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange({ depositManuallyEdited: true })}
              >
                Modifier
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
