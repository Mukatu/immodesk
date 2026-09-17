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
import { MoneyInput } from '@/components/business/money-input';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useResolveMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface ResolveDialogProps {
  requestId: string;
}

/** Résolution (→ `RESOLVED`) : message, montant réel et photo facultatifs. */
export function ResolveDialog({ requestId }: ResolveDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [actualAmount, setActualAmount] = React.useState<number | null>(null);
  const [photoDocumentId, setPhotoDocumentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const resolve = useResolveMaintenanceRequest(requestId);

  async function handleConfirm() {
    setError(null);
    try {
      await resolve.mutateAsync({
        message: message.trim() || undefined,
        actualAmount: actualAmount ?? undefined,
        photoDocumentId: photoDocumentId ?? undefined,
      });
      toast.success('Demande résolue.');
      setOpen(false);
      setPhotoDocumentId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Résoudre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Résoudre la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resolve-amount">Montant réel de l&apos;intervention (facultatif)</Label>
            <MoneyInput id="resolve-amount" value={actualAmount} onValueChange={setActualAmount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resolve-message">Message (facultatif)</Label>
            <Textarea
              id="resolve-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Photo (facultative)</Label>
            {photoDocumentId ? (
              <p className="text-sm text-success">Photo jointe.</p>
            ) : (
              <DocumentUploader
                relatedEntityType="maintenance_request"
                relatedEntityId={requestId}
                kind="MAINTENANCE_PHOTO"
                onUploaded={(doc) => setPhotoDocumentId(doc.id)}
              />
            )}
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={resolve.isPending}>
            {resolve.isPending ? 'Résolution…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
