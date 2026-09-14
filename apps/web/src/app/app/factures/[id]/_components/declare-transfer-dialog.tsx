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
import { MoneyInput } from '@/components/business/money-input';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useCreateBankTransferDeclaration } from '@/lib/api/hooks/use-bank-transfer-declarations';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { PaymentInstructions } from '@/lib/api/types';

export interface DeclareTransferDialogProps {
  invoiceId: string;
  tenantId: string;
  leaseId: string;
  transferReference: string | null;
  bankAccounts: PaymentInstructions['bankAccounts'];
}

/**
 * Déclarer un virement bancaire reçu. Crée uniquement une déclaration
 * `SUBMITTED` : le paiement (`CONFIRMED` ou `PENDING_VERIFICATION` selon
 * `confirmOnApproval`) n'existe qu'après validation par un ACCOUNTANT
 * (arbitrages 1 et 3 du contrat phase 4). La preuve est obligatoire.
 */
export function DeclareTransferDialog({
  invoiceId,
  tenantId,
  leaseId,
  transferReference,
  bankAccounts,
}: DeclareTransferDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [declaredAmount, setDeclaredAmount] = React.useState<number | null>(null);
  const [transferDate, setTransferDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [usedReference, setUsedReference] = React.useState(transferReference ?? '');
  const [payerName, setPayerName] = React.useState('');
  const [beneficiaryBankAccountId, setBeneficiaryBankAccountId] = React.useState('');
  const [proofDocumentId, setProofDocumentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const createDeclaration = useCreateBankTransferDeclaration();

  function reset() {
    setDeclaredAmount(null);
    setTransferDate(new Date().toISOString().slice(0, 10));
    setUsedReference(transferReference ?? '');
    setPayerName('');
    setBeneficiaryBankAccountId('');
    setProofDocumentId(null);
    setError(null);
  }

  async function handleSubmit() {
    if (!declaredAmount || !payerName.trim() || !beneficiaryBankAccountId || !proofDocumentId) {
      setError('Montant, nom du payeur, compte bénéficiaire et preuve sont requis.');
      return;
    }
    setError(null);
    try {
      await createDeclaration.mutateAsync({
        tenantId,
        leaseId,
        invoiceId,
        declaredAmount,
        transferDate,
        transferReference: usedReference.trim() || undefined,
        payerName: payerName.trim(),
        beneficiaryBankAccountId,
        proofDocumentId,
        clientRef: crypto.randomUUID(),
      });
      toast.success(
        'Déclaration enregistrée, en attente de validation. Aucun paiement n’est créé tant que le gestionnaire n’a pas confirmé le virement.',
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
          Déclarer un virement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déclarer un virement bancaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transferAmount">Montant déclaré</Label>
              <MoneyInput
                id="transferAmount"
                value={declaredAmount}
                onValueChange={setDeclaredAmount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferDate">Date du virement</Label>
              <Input
                id="transferDate"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transferRef">Référence utilisée</Label>
            <Input
              id="transferRef"
              value={usedReference}
              onChange={(e) => setUsedReference(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payerName">Nom du payeur</Label>
            <Input
              id="payerName"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beneficiaryAccount">Compte bénéficiaire</Label>
            <select
              id="beneficiaryAccount"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={beneficiaryBankAccountId}
              onChange={(e) => setBeneficiaryBankAccountId(e.target.value)}
            >
              <option value="">Sélectionner un compte</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.bankName} — {account.accountHolderName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Preuve du virement (obligatoire)</Label>
            <DocumentUploader
              relatedEntityType="lease"
              relatedEntityId={leaseId}
              kind="TRANSFER_PROOF"
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
