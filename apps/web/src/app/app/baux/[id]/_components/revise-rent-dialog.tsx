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
import { MoneyInput } from '@/components/business/money-input';
import { useCreateRentRevision } from '@/lib/api/hooks/use-rent-revisions';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface ReviseRentDialogProps {
  leaseId: string;
}

export function ReviseRentDialog({ leaseId }: ReviseRentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [effectiveDate, setEffectiveDate] = React.useState('');
  const [newRentAmount, setNewRentAmount] = React.useState<number | null>(null);
  const [newChargesAmount, setNewChargesAmount] = React.useState<number | null>(null);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const createRevision = useCreateRentRevision(leaseId);

  async function handleConfirm() {
    if (!effectiveDate) {
      setError('La date d’effet est requise.');
      return;
    }
    if (newRentAmount === null || newRentAmount <= 0) {
      setError('Le nouveau loyer est requis.');
      return;
    }
    setError(null);
    try {
      await createRevision.mutateAsync({
        effectiveDate,
        newRentAmount,
        newChargesAmount: newChargesAmount ?? undefined,
        reason: reason.trim() || undefined,
      });
      toast.success('Loyer révisé.');
      setOpen(false);
      setEffectiveDate('');
      setNewRentAmount(null);
      setNewChargesAmount(null);
      setReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Réviser le loyer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réviser le loyer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revisionEffectiveDate">Date d&apos;effet</Label>
            <Input
              id="revisionEffectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revisionRent">Nouveau loyer</Label>
            <MoneyInput id="revisionRent" value={newRentAmount} onValueChange={setNewRentAmount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revisionCharges">Nouvelles charges (optionnel)</Label>
            <MoneyInput
              id="revisionCharges"
              value={newChargesAmount}
              onValueChange={setNewChargesAmount}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revisionReason">Motif (optionnel)</Label>
            <Textarea
              id="revisionReason"
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
          <Button type="button" onClick={handleConfirm} disabled={createRevision.isPending}>
            {createRevision.isPending ? 'Enregistrement…' : 'Confirmer la révision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
