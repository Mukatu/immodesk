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
import { useFailOwnerPayout } from '@/lib/api/hooks/use-owner-payouts';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export function FailPayoutDialog({ payoutId }: { payoutId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const failPayout = useFailOwnerPayout(payoutId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("Le motif de l'échec est requis.");
      return;
    }
    setError(null);
    try {
      await failPayout.mutateAsync({ reason: reason.trim() });
      toast.success('Reversement marqué en échec. Une nouvelle tentative reste possible.');
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
          Marquer en échec
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Échec du reversement</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="payoutFailReason">Motif</Label>
          <Textarea
            id="payoutFailReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Une nouvelle tentative sera possible sans recréer le reversement.
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
            disabled={failPayout.isPending}
          >
            {failPayout.isPending ? 'Enregistrement…' : "Confirmer l'échec"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
