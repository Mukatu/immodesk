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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssignMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { useMembers } from '@/lib/api/hooks/use-members';
import { useAuth } from '@/lib/auth/auth-context';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface AssignDialogProps {
  requestId: string;
}

/** Affectation (`ACKNOWLEDGED` → `ASSIGNED`) : personne affectée obligatoire, message facultatif. */
export function AssignDialog({ requestId }: AssignDialogProps) {
  const { currentOrganizationId } = useAuth();
  const { data: members } = useMembers(currentOrganizationId);
  const [open, setOpen] = React.useState(false);
  const [assignedToUserId, setAssignedToUserId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const assign = useAssignMaintenanceRequest(requestId);

  async function handleConfirm() {
    if (!assignedToUserId) {
      setError('La personne affectée est requise.');
      return;
    }
    setError(null);
    try {
      await assign.mutateAsync({
        assignedToUserId,
        message: message.trim() || undefined,
      });
      toast.success('Demande affectée.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Affecter</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affecter la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assign-user">Personne affectée</Label>
            <Select value={assignedToUserId || undefined} onValueChange={setAssignedToUserId}>
              <SelectTrigger id="assign-user">
                <SelectValue placeholder="Choisir une personne" />
              </SelectTrigger>
              <SelectContent>
                {(members?.items ?? []).map((member) => (
                  <SelectItem key={member.id} value={member.user.id}>
                    {member.user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-message">Message (facultatif)</Label>
            <Textarea
              id="assign-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={assign.isPending}>
            {assign.isPending ? 'Affectation…' : 'Confirmer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
