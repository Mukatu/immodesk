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
import { useReplayWebhookEvent } from '@/lib/api/hooks/use-webhook-events';

/** Bouton « Rejouer » un événement webhook, avec confirmation préalable. */
export function ReplayWebhookButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = React.useState(false);
  const replay = useReplayWebhookEvent(eventId);

  async function handleConfirm() {
    try {
      await replay.mutateAsync();
      toast.success('Événement rejoué.');
      setOpen(false);
    } catch {
      toast.error('Impossible de rejouer cet événement.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Rejouer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejouer cet événement ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          L&apos;événement sera retraité comme s&apos;il venait d&apos;être reçu. Le traitement est
          idempotent : rejouer un événement déjà traité n&apos;a pas d&apos;effet indésirable.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={replay.isPending}>
            {replay.isPending ? 'Rejeu…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
