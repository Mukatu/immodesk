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
import { useBounceBankCheck } from '@/lib/api/hooks/use-bank-checks';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface BounceCheckDialogProps {
  checkId: string;
}

/**
 * Dialog de rejet (impayé) d'un chèque déposé, avec motif obligatoire.
 * Rappelle la conséquence : la facture réglée par ce chèque est rouverte et
 * des frais de rejet peuvent s'appliquer sur la facture SUIVANTE du
 * locataire, jamais sur la facture d'origine.
 */
export function BounceCheckDialog({ checkId }: BounceCheckDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const bounceCheck = useBounceBankCheck(checkId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError(null);
    try {
      await bounceCheck.mutateAsync({ reason: reason.trim() });
      toast.success('Chèque rejeté. La facture d’origine a été rouverte.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason('');
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Rejeter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter ce chèque (impayé)</DialogTitle>
        </DialogHeader>
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          La facture réglée par ce chèque sera rouverte. Des frais de rejet peuvent s’appliquer sur
          la prochaine facture du locataire — jamais sur la facture d’origine.
        </p>
        <div className="space-y-2">
          <Label htmlFor="checkBounceReason">Motif du rejet</Label>
          <Textarea
            id="checkBounceReason"
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
            disabled={bounceCheck.isPending}
          >
            {bounceCheck.isPending ? 'Rejet…' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
