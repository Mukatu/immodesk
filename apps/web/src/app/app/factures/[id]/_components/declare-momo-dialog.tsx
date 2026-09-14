'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { PhoneInput } from '@/components/business/phone-input';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useCreateMomoDeclaration } from '@/lib/api/hooks/use-mobile-money-declarations';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { toE164Congo } from '@/lib/phone';
import type { PaymentInstructions } from '@/lib/api/types';

const DECLARABLE_PROVIDER_LABELS = {
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
} as const;

export interface DeclareMomoDialogProps {
  invoiceId: string;
  tenantId: string;
  leaseId: string;
  mobileMoneyNumbers: PaymentInstructions['mobileMoneyNumbers'];
}

/**
 * Déclarer un paiement Mobile Money reçu hors application (transfert direct au
 * bailleur). Crée uniquement une déclaration `DECLARED` : aucun paiement n'est
 * créé avant validation par un ACCOUNTANT ou un MANAGER (arbitrage 1 du
 * contrat phase 4).
 */
export function DeclareMomoDialog({
  invoiceId,
  tenantId,
  leaseId,
  mobileMoneyNumbers,
}: DeclareMomoDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [provider, setProvider] = React.useState<'MTN_MOMO' | 'AIRTEL_MONEY' | ''>('');
  const [operatorReference, setOperatorReference] = React.useState('');
  const [payerLocal, setPayerLocal] = React.useState('');
  const [payeeMsisdn, setPayeeMsisdn] = React.useState('');
  const [amount, setAmount] = React.useState<number | null>(null);
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [proofDocumentId, setProofDocumentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const createDeclaration = useCreateMomoDeclaration();

  function reset() {
    setProvider('');
    setOperatorReference('');
    setPayerLocal('');
    setPayeeMsisdn('');
    setAmount(null);
    setPaidAt(new Date().toISOString().slice(0, 10));
    setProofDocumentId(null);
    setError(null);
  }

  async function handleSubmit() {
    const payerMsisdn = toE164Congo(payerLocal);
    if (!provider || !operatorReference.trim() || !payerMsisdn || !payeeMsisdn || !amount) {
      setError('Opérateur, référence, numéro payeur, numéro de réception et montant sont requis.');
      return;
    }
    setError(null);
    try {
      await createDeclaration.mutateAsync({
        tenantId,
        leaseId,
        invoiceId,
        provider,
        operatorReference: operatorReference.trim(),
        payerMsisdn,
        payeeMsisdn,
        amount,
        paidAt,
        proofDocumentId: proofDocumentId ?? undefined,
        clientRef: crypto.randomUUID(),
      });
      toast.success(
        'Déclaration enregistrée, en attente de validation. Aucun paiement n’est créé tant que le gestionnaire n’a pas vérifié la transaction.',
      );
      setOpen(false);
      reset();
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
        <Button type="button" variant="outline">
          Déclarer un paiement Mobile Money
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déclarer un paiement Mobile Money</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="momoProvider">Opérateur</Label>
            <EnumSelect
              id="momoProvider"
              value={provider}
              onValueChange={setProvider}
              labels={DECLARABLE_PROVIDER_LABELS}
              placeholder="Sélectionner un opérateur"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="momoOperatorRef">Référence opérateur</Label>
            <Input
              id="momoOperatorRef"
              value={operatorReference}
              onChange={(e) => setOperatorReference(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="momoPayer">Numéro payeur</Label>
            <PhoneInput id="momoPayer" value={payerLocal} onValueChange={setPayerLocal} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="momoPayee">Numéro de réception</Label>
            <select
              id="momoPayee"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={payeeMsisdn}
              onChange={(e) => setPayeeMsisdn(e.target.value)}
            >
              <option value="">Sélectionner un numéro</option>
              {mobileMoneyNumbers.map((momo) => (
                <option key={momo.bankAccountId} value={momo.msisdn}>
                  {momo.msisdn} — {momo.holderName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="momoAmount">Montant</Label>
              <MoneyInput id="momoAmount" value={amount} onValueChange={setAmount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="momoPaidAt">Date du paiement</Label>
              <Input
                id="momoPaidAt"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preuve (capture d&apos;écran, facultatif)</Label>
            <DocumentUploader
              relatedEntityType="lease"
              relatedEntityId={leaseId}
              kind="OTHER"
              onUploaded={(doc) => setProofDocumentId(doc.id)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={createDeclaration.isPending}>
            {createDeclaration.isPending ? 'Envoi…' : 'Déclarer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
