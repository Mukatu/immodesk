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
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface RejectDeclarationDialogProps {
  onReject: (input: { reason: string }) => Promise<unknown>;
  onRejected?: () => void;
}

/**
 * Formulaire de rejet d'une déclaration : motif OBLIGATOIRE (contrat : « aucun
 * paiement » créé, locataire notifié). Bloque la soumission tant que le motif
 * est vide, sans appeler la mutation.
 */
export function RejectDeclarationDialog({ onReject, onRejected }: RejectDeclarationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est obligatoire pour rejeter une déclaration.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onReject({ reason: reason.trim() });
      toast.success('Déclaration rejetée.');
      setOpen(false);
      onRejected?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    } finally {
      setIsSubmitting(false);
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
          <DialogTitle>Rejeter cette déclaration</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejectReason">
            Motif <span aria-hidden="true">*</span>
            <span className="sr-only">(obligatoire)</span>
          </Label>
          <Textarea
            id="rejectReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-required="true"
            aria-invalid={error ? true : undefined}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Rejet…' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
