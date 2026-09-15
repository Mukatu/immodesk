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
import { Textarea } from '@/components/ui/textarea';
import { useTerminateMandate } from '@/lib/api/hooks/use-mandates';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TerminateMandateDialog({ mandateId }: { mandateId: string }) {
  const [open, setOpen] = React.useState(false);
  const [effectiveDate, setEffectiveDate] = React.useState(today());
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const terminateMandate = useTerminateMandate(mandateId);

  async function handleConfirm() {
    if (!effectiveDate || !reason.trim()) {
      setError('La date d’effet et le motif sont requis.');
      return;
    }
    setError(null);
    try {
      await terminateMandate.mutateAsync({ effectiveDate, reason: reason.trim() });
      toast.success('Mandat résilié.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          Résilier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résilier le mandat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mandateTerminateDate">Date d&apos;effet</Label>
            <Input
              id="mandateTerminateDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mandateTerminateReason">Motif</Label>
            <Textarea
              id="mandateTerminateReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Les relevés déjà émis restent intacts. Le mois de résiliation donne lieu à un dernier
            relevé au prorata des encaissements perçus avant la date d&apos;effet.
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
            disabled={terminateMandate.isPending}
          >
            {terminateMandate.isPending ? 'Résiliation…' : 'Confirmer la résiliation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
