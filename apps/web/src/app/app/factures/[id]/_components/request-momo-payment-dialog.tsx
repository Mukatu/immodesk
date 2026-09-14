'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PhoneInput } from '@/components/business/phone-input';
import { MomoWaitingPanel } from '@/components/business/momo-waiting-panel';
import {
  useInitiateMomoPayment,
  useMomoQuote,
} from '@/lib/api/hooks/use-mobile-money-transactions';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo } from '@/lib/phone';
import { useMomoStatusPolling } from './use-momo-status-polling';

export interface RequestMomoPaymentDialogProps {
  invoiceId: string;
  tenantId: string;
}

type Step = 'form' | 'quote' | 'waiting';

/**
 * Demander un paiement Mobile Money agrégateur (le locataire valide la
 * demande reçue sur son téléphone). Le devis précède toujours la validation
 * (arbitrage du contrat phase 4) ; l'écran d'attente interroge le statut
 * toutes les 3 secondes jusqu'à un résultat final.
 */
export function RequestMomoPaymentDialog({ invoiceId, tenantId }: RequestMomoPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>('form');
  const [amount, setAmount] = React.useState<number | null>(null);
  const [payerLocal, setPayerLocal] = React.useState('');
  const [transactionId, setTransactionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const quote = useMomoQuote();
  const initiate = useInitiateMomoPayment();
  const { status, secondsRemaining } = useMomoStatusPolling(transactionId, 'INITIATED');

  function reset() {
    setStep('form');
    setAmount(null);
    setPayerLocal('');
    setTransactionId(null);
    setError(null);
    quote.reset();
  }

  async function handleQuote() {
    if (!amount || !toE164Congo(payerLocal)) {
      setError('Montant et numéro payeur sont requis.');
      return;
    }
    setError(null);
    try {
      await quote.mutateAsync({ invoiceId, amount });
      setStep('quote');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleConfirm() {
    const payerMsisdn = toE164Congo(payerLocal);
    if (!amount || !payerMsisdn) return;
    setError(null);
    try {
      const result = await initiate.mutateAsync({
        invoiceId,
        tenantId,
        amount,
        payerMsisdn,
        clientRef: crypto.randomUUID(),
      });
      setTransactionId(result.transaction.id);
      setStep('waiting');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Demander un paiement Mobile Money</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander un paiement Mobile Money</DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aggAmount">Montant</Label>
              <MoneyInput id="aggAmount" value={amount} onValueChange={setAmount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aggPayer">Numéro payeur</Label>
              <PhoneInput id="aggPayer" value={payerLocal} onValueChange={setPayerLocal} />
            </div>
          </div>
        ) : null}

        {step === 'quote' && quote.data ? (
          <div className="space-y-2 rounded-md border border-border p-3 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Montant demandé</span>
              <MoneyXaf amount={quote.data.amount} />
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Frais</span>
              <MoneyXaf amount={quote.data.feeAmount} />
            </p>
            <p className="flex justify-between font-medium">
              <span>Total débité</span>
              <MoneyXaf amount={quote.data.totalDebited} />
            </p>
            <p className="flex justify-between font-medium">
              <span>Net perçu</span>
              <MoneyXaf amount={quote.data.netReceived} />
            </p>
          </div>
        ) : null}

        {step === 'waiting' ? (
          <MomoWaitingPanel status={status} secondsRemaining={secondsRemaining} />
        ) : null}

        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        {step !== 'waiting' ? (
          <DialogFooter>
            {step === 'quote' ? (
              <Button type="button" variant="outline" onClick={() => setStep('form')}>
                Modifier
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={step === 'form' ? handleQuote : handleConfirm}
              disabled={quote.isPending || initiate.isPending}
            >
              {step === 'form'
                ? quote.isPending
                  ? 'Calcul du devis…'
                  : 'Obtenir le devis'
                : initiate.isPending
                  ? 'Lancement…'
                  : 'Confirmer et lancer le paiement'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
