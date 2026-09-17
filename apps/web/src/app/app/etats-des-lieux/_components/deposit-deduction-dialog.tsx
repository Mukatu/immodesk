'use client';

import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/business/money-input';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useCreateDepositDeduction } from '@/lib/api/hooks/use-inspections';
import type { InspectionItem } from '@/lib/api/types';
import { inspectionErrorMessage } from './inspection-error-message';

export interface DepositDeductionDialogProps {
  inspectionId: string;
  item: InspectionItem;
  onApplied?: () => void;
}

/**
 * Retenue sur le dépôt de garantie pour un poste dégradé (arbitrage 4 du
 * contrat) : le libellé du mouvement reprend obligatoirement la pièce et
 * l'élément, en dur, côté client comme côté mock.
 */
export function DepositDeductionDialog({
  inspectionId,
  item,
  onApplied,
}: DepositDeductionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<number | null>(item.repairAmount ?? null);
  const [error, setError] = React.useState<string | null>(null);
  const createDeduction = useCreateDepositDeduction(inspectionId, item.id);

  async function handleConfirm() {
    if (amount === null || amount <= 0) {
      setError('Le montant de la retenue est requis.');
      return;
    }
    setError(null);
    try {
      await createDeduction.mutateAsync({
        amount,
        reason: `${item.roomLabel} — ${item.elementLabel}`,
      });
      toast.success('Retenue appliquée au dépôt de garantie.');
      setOpen(false);
      onApplied?.();
    } catch (err) {
      setError(inspectionErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm">
          Retenue sur dépôt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Retenue sur dépôt — {item.roomLabel} / {item.elementLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm text-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              Une seule retenue est possible pour ce poste, et elle est exclusive d&apos;une
              conversion en demande de maintenance.
            </span>
          </p>
          <div className="space-y-2">
            <Label htmlFor={`deduction-amount-${item.id}`}>Montant retenu</Label>
            <MoneyInput
              id={`deduction-amount-${item.id}`}
              value={amount}
              onValueChange={setAmount}
            />
          </div>
          <p className="text-sm">
            Montant retenu : <MoneyXaf amount={amount ?? 0} className="font-medium" />
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={createDeduction.isPending}
          >
            {createDeduction.isPending ? 'Validation…' : 'Confirmer la retenue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
