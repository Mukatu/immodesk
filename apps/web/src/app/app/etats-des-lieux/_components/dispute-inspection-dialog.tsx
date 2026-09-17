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
import { useDisputeInspection } from '@/lib/api/hooks/use-inspections';
import { inspectionErrorMessage } from './inspection-error-message';

export interface DisputeInspectionDialogProps {
  inspectionId: string;
}

/** Contestation d'un état des lieux signé : motif obligatoire, ne touche jamais le constat d'origine. */
export function DisputeInspectionDialog({ inspectionId }: DisputeInspectionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const disputeInspection = useDisputeInspection(inspectionId);

  async function handleConfirm() {
    if (!reason.trim()) {
      setError('Le motif de la contestation est requis.');
      return;
    }
    setError(null);
    try {
      await disputeInspection.mutateAsync({ reason: reason.trim() });
      toast.success('État des lieux marqué comme contesté.');
      setOpen(false);
    } catch (err) {
      setError(inspectionErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Contester
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contester cet état des lieux</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="disputeReason">Motif</Label>
          <Textarea id="disputeReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Le constat d&apos;origine (postes, photos) n&apos;est jamais modifié par une
            contestation.
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
            disabled={disputeInspection.isPending}
          >
            {disputeInspection.isPending ? 'Envoi…' : 'Confirmer la contestation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
