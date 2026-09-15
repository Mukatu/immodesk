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
import { useRejectExpense } from '@/lib/api/hooks/use-expenses';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export function RejectExpenseDialog({ expenseId }: { expenseId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const rejectExpense = useRejectExpense(expenseId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif de rejet est requis.');
      return;
    }
    setError(null);
    try {
      await rejectExpense.mutateAsync({ reason: reason.trim() });
      toast.success('Dépense rejetée.');
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Rejeter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter la dépense</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejectExpenseReason">Motif</Label>
          <Textarea
            id="rejectExpenseReason"
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
            disabled={rejectExpense.isPending}
          >
            {rejectExpense.isPending ? 'Rejet…' : 'Confirmer le rejet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
