'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { useReversePayment } from '@/lib/api/hooks/use-payments';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface ReversePaymentDialogProps {
  paymentId: string;
}

/**
 * Dialog de contre-passation d'un paiement confirmé : motif obligatoire, avertit
 * des conséquences (facture repasse ouverte, quittance annulée) avant validation.
 */
export function ReversePaymentDialog({ paymentId }: ReversePaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const reversePayment = useReversePayment(paymentId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError(null);
    try {
      const result = await reversePayment.mutateAsync({ reason: reason.trim() });
      toast.success('Paiement contre-passé.');
      setOpen(false);
      router.push(`/app/paiements/${result.reversal.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Contre-passer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contre-passer ce paiement</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Le paiement d&apos;origine restera inchangé. Une écriture inverse sera créée : la ou les
          factures concernées repasseront ouvertes (ou en retard) et toute quittance liée sera
          annulée. Cette action est irréversible.
        </p>
        <div className="space-y-2">
          <Label htmlFor="paymentReverseReason">Motif</Label>
          <Textarea
            id="paymentReverseReason"
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
            disabled={reversePayment.isPending}
          >
            {reversePayment.isPending ? 'Contre-passation…' : 'Confirmer la contre-passation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
