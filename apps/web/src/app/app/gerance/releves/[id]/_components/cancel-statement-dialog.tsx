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
import { useCancelOwnerStatement } from '@/lib/api/hooks/use-owner-statements';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export function CancelStatementDialog({ statementId }: { statementId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const cancelStatement = useCancelOwnerStatement(statementId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("Le motif d'annulation est requis.");
      return;
    }
    setError(null);
    try {
      await cancelStatement.mutateAsync({ reason: reason.trim() });
      toast.success('Relevé annulé.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Annuler le relevé
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler le relevé</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancelStatementReason">Motif</Label>
          <Textarea
            id="cancelStatementReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Libère les commissions et dépenses rattachées pour le relevé suivant.
          </p>
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
            disabled={cancelStatement.isPending}
          >
            {cancelStatement.isPending ? 'Annulation…' : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
