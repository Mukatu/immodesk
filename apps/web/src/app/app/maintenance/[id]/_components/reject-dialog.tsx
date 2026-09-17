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
import { useRejectMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface RejectDialogProps {
  requestId: string;
}

/** Refus (→ `REJECTED`) : motif obligatoire et bloquant, conformément au contrat. */
export function RejectDialog({ requestId }: RejectDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const reject = useRejectMaintenanceRequest(requestId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif de refus est requis.');
      return;
    }
    setError(null);
    try {
      await reject.mutateAsync({ reason: reason.trim() });
      toast.success('Demande refusée.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Refuser
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Motif</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-describedby={error ? 'reject-reason-error' : undefined}
          />
        </div>
        {error ? (
          <p id="reject-reason-error" role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={reject.isPending}
          >
            {reject.isPending ? 'Refus…' : 'Confirmer le refus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
