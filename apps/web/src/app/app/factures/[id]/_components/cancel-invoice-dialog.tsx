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
import { useCancelInvoice } from '@/lib/api/hooks/use-invoices';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface CancelInvoiceDialogProps {
  invoiceId: string;
}

/** Dialog d'annulation d'une facture, avec motif obligatoire (facture non payée uniquement). */
export function CancelInvoiceDialog({ invoiceId }: CancelInvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const cancelInvoice = useCancelInvoice(invoiceId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError(null);
    try {
      await cancelInvoice.mutateAsync({ reason: reason.trim() });
      toast.success('Facture annulée.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Annuler la facture
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler cette facture</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="invoiceCancelReason">Motif</Label>
          <Textarea
            id="invoiceCancelReason"
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
          <Button type="button" onClick={handleConfirm} disabled={cancelInvoice.isPending}>
            {cancelInvoice.isPending ? 'Annulation…' : 'Confirmer l’annulation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
