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
import { MoneyXaf } from '@/components/business/money-xaf';
import { useTerminateLease } from '@/lib/api/hooks/use-leases';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface TerminateLeaseDialogProps {
  leaseId: string;
  depositHeldAmount: number | null;
  triggerLabel?: string;
}

/** Dialogue de résiliation, réutilisable depuis la fiche bail (statuts ACTIVE et NOTICE_GIVEN). */
export function TerminateLeaseDialog({
  leaseId,
  depositHeldAmount,
  triggerLabel = 'Résilier',
}: TerminateLeaseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [effectiveDate, setEffectiveDate] = React.useState(today());
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const terminateLease = useTerminateLease(leaseId);

  async function handleConfirm() {
    if (!effectiveDate) {
      setError('La date d’effet est requise.');
      return;
    }
    setError(null);
    try {
      await terminateLease.mutateAsync({ effectiveDate, reason: reason.trim() });
      toast.success('Bail résilié.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résilier le bail</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="terminateEffectiveDate">Date d&apos;effet</Label>
            <Input
              id="terminateEffectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminateReason">Motif</Label>
            <Textarea
              id="terminateReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {depositHeldAmount !== null ? (
            <p className="text-sm text-muted-foreground">
              Solde du dépôt restituable après résiliation :{' '}
              <MoneyXaf amount={depositHeldAmount} className="font-medium text-foreground" />
            </p>
          ) : null}
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
            disabled={terminateLease.isPending}
          >
            {terminateLease.isPending ? 'Résiliation…' : 'Confirmer la résiliation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
