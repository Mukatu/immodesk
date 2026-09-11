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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRejectPayment } from '@/lib/api/hooks/use-payments';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface RejectPaymentDialogProps {
  paymentId: string;
}

/** Dialog de rejet d'un paiement en attente de vérification, avec motif obligatoire. */
export function RejectPaymentDialog({ paymentId }: RejectPaymentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const rejectPayment = useRejectPayment(paymentId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError(null);
    try {
      await rejectPayment.mutateAsync({ reason: reason.trim() });
      toast.success('Paiement rejeté.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Rejeter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter ce paiement</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="paymentRejectReason">Motif</Label>
          <Textarea
            id="paymentRejectReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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
            disabled={rejectPayment.isPending}
          >
            {rejectPayment.isPending ? 'Rejet…' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
