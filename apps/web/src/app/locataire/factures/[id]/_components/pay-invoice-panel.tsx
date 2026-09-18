'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MomoWaitingPanel } from '@/components/business/momo-waiting-panel';
import { PhoneInput } from '@/components/business/phone-input';
import { toE164Congo } from '@/lib/phone';
import { useTenantInvoicePayment } from './use-tenant-invoice-payment';

export interface PayInvoicePanelProps {
  invoiceId: string;
}

/** Panneau de paiement Mobile Money d'une facture depuis le portail locataire. */
export function PayInvoicePanel({ invoiceId }: PayInvoicePanelProps) {
  const [localPhone, setLocalPhone] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const { start, reset, status, secondsRemaining, isSubmitting, error } =
    useTenantInvoicePayment(invoiceId);

  async function handleSubmit() {
    const payerMsisdn = toE164Congo(localPhone);
    if (!payerMsisdn) {
      setFormError('Numéro payeur incomplet.');
      return;
    }
    setFormError(null);
    await start(payerMsisdn);
  }

  const isWaiting = status !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payer par Mobile Money</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWaiting ? (
          <div className="space-y-2">
            <Label htmlFor="tenant-payer-phone">Numéro payeur</Label>
            <PhoneInput id="tenant-payer-phone" value={localPhone} onValueChange={setLocalPhone} />
            <Button type="button" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Envoi en cours…' : 'Demander le paiement'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <MomoWaitingPanel status={status} secondsRemaining={secondsRemaining} />
            {status !== 'PENDING' && status !== 'INITIATED' ? (
              <Button type="button" variant="outline" className="w-full" onClick={reset}>
                Réessayer
              </Button>
            ) : null}
          </div>
        )}

        {formError || error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError ?? error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
