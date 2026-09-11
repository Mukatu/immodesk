'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActivateLease } from '@/lib/api/hooks/use-leases';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface ActivateLeaseDialogProps {
  leaseId: string;
  defaultMoveInDate: string;
}

export function ActivateLeaseDialog({ leaseId, defaultMoveInDate }: ActivateLeaseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [moveInDate, setMoveInDate] = React.useState(defaultMoveInDate);
  const [error, setError] = React.useState<string | null>(null);
  const activateLease = useActivateLease(leaseId);

  async function handleConfirm() {
    setError(null);
    try {
      await activateLease.mutateAsync({ moveInDate: moveInDate || undefined });
      toast.success('Bail activé.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Activer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activer le bail</DialogTitle>
          <DialogDescription>
            Le lot passera au statut occupé et le dépôt de garantie sera créé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="moveInDate">Date d&apos;entrée dans les lieux</Label>
          <Input
            id="moveInDate"
            type="date"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={activateLease.isPending}>
            {activateLease.isPending ? 'Activation…' : 'Confirmer l’activation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
