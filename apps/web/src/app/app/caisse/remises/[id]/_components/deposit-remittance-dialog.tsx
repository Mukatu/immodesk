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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBankAccounts } from '@/lib/api/hooks/use-bank-accounts';
import { useDepositCashRemittance } from '@/lib/api/hooks/use-cash-remittances';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface DepositRemittanceDialogProps {
  remittanceId: string;
}

/** Dialog de dépôt en banque d'une remise vérifiée (étape finale, rôle comptable). */
export function DepositRemittanceDialog({ remittanceId }: DepositRemittanceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [bankAccountId, setBankAccountId] = React.useState('');
  const [depositedAt, setDepositedAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | null>(null);
  const { data: bankAccountsData } = useBankAccounts({ holderType: 'ORGANIZATION' });
  const depositRemittance = useDepositCashRemittance(remittanceId);

  async function handleConfirm() {
    if (!bankAccountId) {
      setError('Le compte bancaire de dépôt est requis.');
      return;
    }
    setError(null);
    try {
      await depositRemittance.mutateAsync({
        bankAccountId,
        depositedAt: new Date(depositedAt).toISOString(),
      });
      toast.success('Remise marquée comme déposée en banque.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Déposer en banque</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dépôt en banque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="depositBankAccount">Compte bancaire</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger id="depositBankAccount">
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                {(bankAccountsData?.items ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.label} — {account.bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="depositedAt">Date de dépôt</Label>
            <Input
              id="depositedAt"
              type="date"
              value={depositedAt}
              onChange={(e) => setDepositedAt(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={depositRemittance.isPending}>
            {depositRemittance.isPending ? 'Dépôt…' : 'Confirmer le dépôt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
