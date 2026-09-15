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
import { DocumentUploader } from '@/components/business/document-uploader';
import { useExecuteOwnerPayout } from '@/lib/api/hooks/use-owner-payouts';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { PaymentMethod } from '@/lib/api/types';

export interface ExecutePayoutDialogProps {
  payoutId: string;
  method: PaymentMethod;
}

/** Exécution du reversement : preuve obligatoire, référence MoMo si Mobile Money. */
export function ExecutePayoutDialog({ payoutId, method }: ExecutePayoutDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [proofDocumentId, setProofDocumentId] = React.useState<string | null>(null);
  const [momoTransactionId, setMomoTransactionId] = React.useState('');
  const [externalReference, setExternalReference] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const executePayout = useExecuteOwnerPayout(payoutId);

  async function handleConfirm() {
    if (!proofDocumentId) {
      setError('La preuve de reversement est requise.');
      return;
    }
    setError(null);
    try {
      await executePayout.mutateAsync({
        proofDocumentId,
        momoTransactionId: momoTransactionId.trim() || undefined,
        externalReference: externalReference.trim() || undefined,
      });
      toast.success('Reversement exécuté.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          Exécuter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exécuter le reversement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Preuve de reversement</Label>
            <DocumentUploader
              relatedEntityType="payout"
              relatedEntityId={payoutId}
              kind="TRANSFER_PROOF"
              onUploaded={(doc) => setProofDocumentId(doc.id)}
            />
            {proofDocumentId ? <p className="text-sm text-success">Preuve ajoutée.</p> : null}
          </div>
          {method === 'MOBILE_MONEY' ? (
            <div className="space-y-2">
              <Label htmlFor="payout-momo-tx">Référence de transaction Mobile Money</Label>
              <Input
                id="payout-momo-tx"
                value={momoTransactionId}
                onChange={(e) => setMomoTransactionId(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="payout-external-ref">Référence externe (optionnel)</Label>
              <Input
                id="payout-external-ref"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
              />
            </div>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={executePayout.isPending}>
            {executePayout.isPending ? 'Exécution…' : 'Confirmer l’exécution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
