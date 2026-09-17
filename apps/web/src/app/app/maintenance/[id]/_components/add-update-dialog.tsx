'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUploader } from '@/components/business/document-uploader';
import { useAddMaintenanceUpdate } from '@/lib/api/hooks/use-maintenance';
import { MAINTENANCE_STATUS_LABELS } from '@/lib/enum-labels';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface AddUpdateDialogProps {
  requestId: string;
}

type UpdatableStatus = 'IN_PROGRESS' | 'ON_HOLD';

/**
 * Mise à jour avec changement de statut vers `IN_PROGRESS` (intervention) ou
 * `ON_HOLD` (suspension). Le motif (`message`) est obligatoire et bloquant
 * pour la suspension, conformément au contrat.
 */
export function AddUpdateDialog({ requestId }: AddUpdateDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<UpdatableStatus>('IN_PROGRESS');
  const [message, setMessage] = React.useState('');
  const [isVisibleToTenant, setIsVisibleToTenant] = React.useState(false);
  const [photoDocumentId, setPhotoDocumentId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const addUpdate = useAddMaintenanceUpdate(requestId);

  async function handleConfirm() {
    if (newStatus === 'ON_HOLD' && !message.trim()) {
      setError('Le motif de suspension est requis.');
      return;
    }
    setError(null);
    try {
      await addUpdate.mutateAsync({
        newStatus,
        message: message.trim() || undefined,
        isVisibleToTenant,
        photoDocumentId: photoDocumentId ?? undefined,
      });
      toast.success('Mise à jour ajoutée.');
      setOpen(false);
      setMessage('');
      setPhotoDocumentId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          Ajouter une mise à jour
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mise à jour de la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update-status">Nouveau statut</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as UpdatableStatus)}>
              <SelectTrigger id="update-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PROGRESS">{MAINTENANCE_STATUS_LABELS.IN_PROGRESS}</SelectItem>
                <SelectItem value="ON_HOLD">{MAINTENANCE_STATUS_LABELS.ON_HOLD}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-message">
              Motif{newStatus === 'ON_HOLD' ? ' (obligatoire)' : ' (facultatif)'}
            </Label>
            <Textarea
              id="update-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-describedby={error ? 'update-message-error' : undefined}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isVisibleToTenant}
              onChange={(e) => setIsVisibleToTenant(e.target.checked)}
            />
            Visible par le locataire
          </label>
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
          <p
            id="update-message-error"
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={addUpdate.isPending}>
            {addUpdate.isPending ? 'Envoi…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
