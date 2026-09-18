'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PhoneInput } from '@/components/business/phone-input';
import { MomoWaitingPanel } from '@/components/business/momo-waiting-panel';
import { useMomoStatusPolling } from './use-momo-status-polling';
import { usePaySubscriptionInvoice } from '@/lib/api/hooks/use-subscriptions';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo } from '@/lib/phone';
import type { SubscriptionInvoice } from '@/lib/api/types';

export interface PaySubscriptionInvoiceDialogProps {
  invoice: SubscriptionInvoice | null;
  onClose: () => void;
}

/**
 * Paiement Mobile Money d'une facture d'abonnement, `POST
 * /subscription-invoices/{id}/pay` (202). Réutilise le panneau d'attente et
 * le rafraîchissement de statut génériques du module paiements — la
 * transaction créée vit dans la même table `mobile_money_transactions`.
 */
export function PaySubscriptionInvoiceDialog({
  invoice,
  onClose,
}: PaySubscriptionInvoiceDialogProps) {
  const [payerLocal, setPayerLocal] = React.useState('');
  const [transactionId, setTransactionId] = React.useState<string | null>(null);
  const [initialStatus, setInitialStatus] = React.useState<'INITIATED'>('INITIATED');
  const [error, setError] = React.useState<string | null>(null);

  const pay = usePaySubscriptionInvoice(invoice?.id ?? '');
  const { status, secondsRemaining } = useMomoStatusPolling(transactionId, initialStatus);

  function reset() {
    setPayerLocal('');
    setTransactionId(null);
    setError(null);
  }

  async function handlePay() {
    const payerMsisdn = toE164Congo(payerLocal);
    if (!invoice || !payerMsisdn) {
      setError('Numéro payeur invalide.');
      return;
    }
    setError(null);
    try {
      const result = await pay.mutateAsync({
        payerMsisdn,
        clientRef: crypto.randomUUID(),
      });
      setInitialStatus('INITIATED');
      setTransactionId(result.transactionId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog
      open={invoice !== null}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payer la facture d&apos;abonnement</DialogTitle>
        </DialogHeader>

        {invoice && !transactionId ? (
          <div className="space-y-4">
            <p className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant dû</span>
              <MoneyXaf amount={invoice.amount - invoice.paidAmount} className="font-semibold" />
            </p>
            <div className="space-y-2">
              <Label htmlFor="sub-invoice-payer">Numéro payeur Mobile Money</Label>
              <PhoneInput id="sub-invoice-payer" value={payerLocal} onValueChange={setPayerLocal} />
            </div>
          </div>
        ) : null}

        {transactionId ? (
          <MomoWaitingPanel status={status} secondsRemaining={secondsRemaining} />
        ) : null}

        {error ? (
          <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {!transactionId ? (
          <DialogFooter>
            <Button type="button" onClick={handlePay} disabled={pay.isPending}>
              {pay.isPending ? 'Envoi…' : 'Lancer le paiement'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
