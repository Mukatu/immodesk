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
import { useCancelInspection } from '@/lib/api/hooks/use-inspections';
import { inspectionErrorMessage } from './inspection-error-message';

export interface CancelInspectionDialogProps {
  inspectionId: string;
}

/** Annulation d'un état des lieux non signé (aucun motif requis par le contrat). */
export function CancelInspectionDialog({ inspectionId }: CancelInspectionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cancelInspection = useCancelInspection(inspectionId);

  async function handleConfirm() {
    setError(null);
    try {
      await cancelInspection.mutateAsync();
      toast.success('État des lieux annulé.');
      setOpen(false);
    } catch (err) {
      setError(inspectionErrorMessage(err));
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
          <DialogTitle>Annuler cet état des lieux</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cette action est définitive. L&apos;état des lieux passera au statut Annulé.
        </p>
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
            disabled={cancelInspection.isPending}
          >
            {cancelInspection.isPending ? 'Annulation…' : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
