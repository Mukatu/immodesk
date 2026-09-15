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
import { useSuspendMandate } from '@/lib/api/hooks/use-mandates';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export function SuspendMandateDialog({ mandateId }: { mandateId: string }) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const suspendMandate = useSuspendMandate(mandateId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif de suspension est requis.');
      return;
    }
    setError(null);
    try {
      await suspendMandate.mutateAsync({ reason: reason.trim() });
      toast.success('Mandat suspendu.');
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Suspendre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspendre le mandat</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="suspendReason">Motif</Label>
          <Textarea id="suspendReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Aucune commission n&apos;est calculée pendant la suspension.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={suspendMandate.isPending}>
            {suspendMandate.isPending ? 'Suspension…' : 'Confirmer la suspension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
