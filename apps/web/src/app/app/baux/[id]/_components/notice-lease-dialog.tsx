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
import { useNoticeLease } from '@/lib/api/hooks/use-leases';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface NoticeLeaseDialogProps {
  leaseId: string;
}

export function NoticeLeaseDialog({ leaseId }: NoticeLeaseDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [effectiveDate, setEffectiveDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const noticeLease = useNoticeLease(leaseId);

  async function handleConfirm() {
    if (!effectiveDate) {
      setError('La date d’effet est requise.');
      return;
    }
    setError(null);
    try {
      await noticeLease.mutateAsync({ effectiveDate, reason: reason.trim() });
      toast.success('Préavis déposé.');
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Donner préavis
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Donner préavis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="noticeEffectiveDate">Date d&apos;effet</Label>
            <Input
              id="noticeEffectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="noticeReason">Motif</Label>
            <Textarea
              id="noticeReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={handleConfirm} disabled={noticeLease.isPending}>
            {noticeLease.isPending ? 'Enregistrement…' : 'Confirmer le préavis'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
