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
import { Textarea } from '@/components/ui/textarea';
import { EnumSelect } from '@/components/business/enum-select';
import { MoneyInput } from '@/components/business/money-input';
import { useCreateDepositMovement } from '@/lib/api/hooks/use-deposits';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { DEPOSIT_MOVEMENT_TYPE_LABELS } from '@/lib/enum-labels';
import type { DepositMovementType } from '@/lib/api/types';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface DepositMovementDialogProps {
  leaseId: string;
  heldAmount: number;
}

export function DepositMovementDialog({ leaseId, heldAmount }: DepositMovementDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [movementType, setMovementType] = React.useState<DepositMovementType>('COLLECTION');
  const [amount, setAmount] = React.useState<number | null>(null);
  const [movementDate, setMovementDate] = React.useState(today());
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const createMovement = useCreateDepositMovement(leaseId);

  function resetAndClose() {
    setOpen(false);
    setMovementType('COLLECTION');
    setAmount(null);
    setMovementDate(today());
    setReason('');
    setError(null);
  }

  async function handleConfirm() {
    if (amount === null || amount <= 0) {
      setError('Le montant est requis.');
      return;
    }
    if ((movementType === 'REFUND' || movementType === 'DEDUCTION') && amount > heldAmount) {
      setError('Le montant dépasse le solde détenu.');
      return;
    }
    setError(null);
    try {
      await createMovement.mutateAsync({
        movementType,
        amount,
        movementDate,
        reason: reason.trim() || undefined,
      });
      toast.success('Mouvement enregistré.');
      resetAndClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'DEPOSITS.INSUFFICIENT_BALANCE') {
        setError('Le solde détenu est insuffisant pour ce mouvement.');
      } else {
        setError(err instanceof ApiError ? err.message : genericErrorMessage);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Saisir un mouvement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saisir un mouvement de dépôt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="movementType">Type</Label>
            <EnumSelect
              id="movementType"
              value={movementType}
              onValueChange={setMovementType}
              labels={DEPOSIT_MOVEMENT_TYPE_LABELS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="movementAmount">Montant</Label>
            <MoneyInput id="movementAmount" value={amount} onValueChange={setAmount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="movementDate">Date</Label>
            <Input
              id="movementDate"
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="movementReason">Raison (optionnel)</Label>
            <Textarea
              id="movementReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={createMovement.isPending}>
            {createMovement.isPending ? 'Enregistrement…' : 'Enregistrer le mouvement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
