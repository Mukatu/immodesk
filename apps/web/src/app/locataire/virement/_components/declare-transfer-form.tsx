'use client';

import * as React from 'react';
import { UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/business/money-input';
import { validateDocumentFile } from '@/components/business/document-uploader';
import { useTenantAuth } from '@/lib/auth/tenant-auth-context';
import {
  useCreateTenantBankTransferDeclaration,
  useCreateTenantDocument,
  useRequestTenantUploadUrl,
  useTenantLeasePaymentInstructions,
} from '@/lib/api/hooks/use-tenant-portal';
import { ApiError, genericErrorMessage } from '@/lib/api/tenant-client';
import { uploadTenantProof } from '../_lib/upload-tenant-proof';

/** Formulaire de déclaration de virement bancaire (preuve obligatoire). */
export function DeclareTransferForm() {
  const { tenant } = useTenantAuth();
  const leases = tenant?.leases ?? [];
  const create = useCreateTenantBankTransferDeclaration();
  const requestUploadUrl = useRequestTenantUploadUrl();
  const createDocument = useCreateTenantDocument();

  const [leaseId, setLeaseId] = React.useState(leases[0]?.id ?? '');
  const { data: instructions, isLoading: isLoadingAccounts } = useTenantLeasePaymentInstructions(
    leaseId || null,
  );
  const bankAccounts = instructions?.bankAccounts ?? [];
  const [amount, setAmount] = React.useState<number | null>(null);
  const [transferDate, setTransferDate] = React.useState('');
  const [payerName, setPayerName] = React.useState(tenant?.displayName ?? '');
  const [beneficiaryBankAccountId, setBeneficiaryBankAccountId] = React.useState('');
  const [transferReference, setTransferReference] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Présélectionne le compte quand la liste arrive (ou change de bail) : un
  // seul compte de destination existe le plus souvent (arbitrage phase 4).
  React.useEffect(() => {
    if (bankAccounts.length === 0) {
      setBeneficiaryBankAccountId('');
      return;
    }
    if (!bankAccounts.some((a) => a.id === beneficiaryBankAccountId) && bankAccounts[0]) {
      setBeneficiaryBankAccountId(bankAccounts[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccounts]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!selected) return;
    const validationError = validateDocumentFile(selected);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (
      !tenant ||
      !leaseId ||
      !amount ||
      !transferDate ||
      !payerName ||
      !beneficiaryBankAccountId
    ) {
      setError('Tous les champs obligatoires doivent être renseignés.');
      return;
    }
    if (!file) {
      setError('La preuve du virement (capture ou photo) est obligatoire.');
      return;
    }

    try {
      setUploadProgress(0);
      const document = await uploadTenantProof(file, leaseId, tenant.tenantId, setUploadProgress, {
        requestUploadUrl: requestUploadUrl.mutateAsync,
        createDocument: createDocument.mutateAsync,
      });
      setUploadProgress(null);

      await create.mutateAsync({
        leaseId,
        declaredAmount: amount,
        transferDate,
        payerName,
        beneficiaryBankAccountId,
        transferReference: transferReference || undefined,
        notes: notes || undefined,
        proofDocumentId: document.id,
        clientRef: crypto.randomUUID(),
      });

      setSuccess(true);
      setAmount(null);
      setTransferDate('');
      setTransferReference('');
      setNotes('');
      setBeneficiaryBankAccountId('');
      setFile(null);
    } catch (err) {
      setUploadProgress(null);
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Déclarer un virement</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {leases.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="transfer-lease">Bail concerné</Label>
              <Select value={leaseId} onValueChange={setLeaseId}>
                <SelectTrigger id="transfer-lease">
                  <SelectValue placeholder="Choisir un bail" />
                </SelectTrigger>
                <SelectContent>
                  {leases.map((lease) => (
                    <SelectItem key={lease.id} value={lease.id}>
                      {lease.property} — {lease.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Montant déclaré</Label>
            <MoneyInput id="transfer-amount" value={amount} onValueChange={setAmount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-date">Date du virement</Label>
            <Input
              id="transfer-date"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-payer">Nom du payeur</Label>
            <Input
              id="transfer-payer"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-account">Compte bancaire de destination</Label>
            {isLoadingAccounts ? (
              <p className="text-sm text-muted-foreground">Chargement des comptes…</p>
            ) : bankAccounts.length > 0 ? (
              <Select value={beneficiaryBankAccountId} onValueChange={setBeneficiaryBankAccountId}>
                <SelectTrigger id="transfer-account">
                  <SelectValue placeholder="Choisir un compte" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} — {account.accountHolderName}
                      {account.accountNumber ? ` (${account.accountNumber})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun compte de destination n&apos;est encore configuré pour ce bail. Contactez
                votre gestionnaire.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-reference">Référence du virement (facultatif)</Label>
            <Input
              id="transfer-reference"
              value={transferReference}
              onChange={(e) => setTransferReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-notes">Notes (facultatif)</Label>
            <Textarea
              id="transfer-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-proof">Preuve du virement (capture ou photo)</Label>
            <Input id="transfer-proof" type="file" onChange={handleFileChange} />
            {file ? <p className="text-sm text-muted-foreground">{file.name}</p> : null}
            {uploadProgress !== null ? (
              <p className="text-sm text-muted-foreground">Envoi… {uploadProgress}%</p>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          {success ? (
            <p role="status" className="text-sm font-medium text-success">
              Déclaration envoyée. Elle sera examinée par votre gestionnaire.
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={create.isPending || bankAccounts.length === 0}
          >
            <UploadCloud className="mr-2 size-4" aria-hidden="true" />
            {create.isPending ? 'Envoi en cours…' : 'Envoyer la déclaration'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
