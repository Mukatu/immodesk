'use client';

import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAcknowledgeMaintenanceRequest } from '@/lib/api/hooks/use-maintenance';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface AcknowledgeButtonProps {
  requestId: string;
  onError: (message: string) => void;
}

/** Prise en compte (`OPEN` → `ACKNOWLEDGED`), sans motif ni saisie. */
export function AcknowledgeButton({ requestId, onError }: AcknowledgeButtonProps) {
  const acknowledge = useAcknowledgeMaintenanceRequest(requestId);

  async function handleClick() {
    try {
      await acknowledge.mutateAsync();
      toast.success('Demande prise en compte.');
    } catch (err) {
      onError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Button type="button" onClick={handleClick} disabled={acknowledge.isPending}>
      {acknowledge.isPending ? 'Prise en compte…' : 'Prendre en compte'}
    </Button>
  );
}
