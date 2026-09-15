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
import { useDepositBankCheck } from '@/lib/api/hooks/use-bank-checks';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface DepositCheckDialogProps {
  checkId: string;
}

/** Dialog de dépôt en banque d'un chèque reçu : date et compte de dépôt obligatoires. */
export function DepositCheckDialog({ checkId }: DepositCheckDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [depositBankAccountId, setDepositBankAccountId] = React.useState('');
  const [depositDate, setDepositDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = React.useState<string | null>(null);
  // Tous les comptes de l'organisation (dépôt possible sur le compte de
  // l'agence comme sur celui d'un bailleur sous mandat).
  const { data: bankAccountsData } = useBankAccounts();
  const depositCheck = useDepositBankCheck(checkId);

  async function handleConfirm() {
    if (!depositBankAccountId) {
      setError('Le compte bancaire de dépôt est requis.');
      return;
    }
    setError(null);
    try {
      await depositCheck.mutateAsync({ depositDate, depositBankAccountId });
      toast.success('Chèque déposé en banque.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          Déposer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déposer ce chèque en banque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkDepositAccount">Compte de dépôt</Label>
            <Select value={depositBankAccountId} onValueChange={setDepositBankAccountId}>
              <SelectTrigger id="checkDepositAccount">
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
            <Label htmlFor="checkDepositDate">Date de dépôt</Label>
            <Input
              id="checkDepositDate"
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={depositCheck.isPending}>
            {depositCheck.isPending ? 'Dépôt…' : 'Confirmer le dépôt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
