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
import { useCancelLease } from '@/lib/api/hooks/use-leases';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface CancelLeaseDialogProps {
  leaseId: string;
}

export function CancelLeaseDialog({ leaseId }: CancelLeaseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const cancelLease = useCancelLease(leaseId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError(null);
    try {
      await cancelLease.mutateAsync({ reason: reason.trim() });
      toast.success('Bail annulé.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Annuler
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler ce bail brouillon</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancelReason">Motif</Label>
          <Textarea id="cancelReason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={cancelLease.isPending}>
            {cancelLease.isPending ? 'Annulation…' : 'Confirmer l’annulation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
