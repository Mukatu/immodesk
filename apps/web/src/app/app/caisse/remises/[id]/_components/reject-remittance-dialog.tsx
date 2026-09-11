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
import { useRejectCashRemittance } from '@/lib/api/hooks/use-cash-remittances';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface RejectRemittanceDialogProps {
  remittanceId: string;
}

/** Dialog de rejet d'une remise (les reçus repassent ISSUED, à remettre à nouveau). */
export function RejectRemittanceDialog({ remittanceId }: RejectRemittanceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const rejectRemittance = useRejectCashRemittance(remittanceId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif est requis.');
      return;
    }
    setError(null);
    try {
      await rejectRemittance.mutateAsync({ reason: reason.trim() });
      toast.success('Remise rejetée, les reçus repassent disponibles.');
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
          <DialogTitle>Rejeter cette remise</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="remittanceRejectReason">Motif</Label>
          <Textarea
            id="remittanceRejectReason"
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
            disabled={rejectRemittance.isPending}
          >
            {rejectRemittance.isPending ? 'Rejet…' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
