'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCloseMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface CloseButtonProps {
  requestId: string;
  onError: (message: string) => void;
}

/** Clôture (`RESOLVED` → `CLOSED`), sans motif ni saisie. */
export function CloseButton({ requestId, onError }: CloseButtonProps) {
  const closeRequest = useCloseMaintenanceRequest(requestId);

  async function handleClick() {
    try {
      await closeRequest.mutateAsync();
      toast.success('Demande clôturée.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={closeRequest.isPending}>
      {closeRequest.isPending ? 'Clôture…' : 'Clôturer'}
    </Button>
  );
}
