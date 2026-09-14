'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRefreshMomoTransaction } from '@/lib/api/hooks/use-mobile-money-transactions';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { MOMO_STATUS_LABELS } from '@/lib/enum-labels';

export interface RefreshMomoButtonProps {
  transactionId: string;
}

/**
 * Bouton « Re-interroger » sur une transaction agrégateur en cours (force
 * `getStatus` côté contrat). Un hook par ligne : `useRefreshMomoTransaction`
 * prend l'id en paramètre, d'où ce composant dédié plutôt qu'un appel dans la
 * boucle de rendu du tableau.
 */
export function RefreshMomoButton({ transactionId }: RefreshMomoButtonProps) {
  const refresh = useRefreshMomoTransaction(transactionId);

  async function handleRefresh() {
    try {
      const updated = await refresh.mutateAsync();
      toast.success(`Statut mis à jour : ${MOMO_STATUS_LABELS[updated.status]}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={refresh.isPending}
    >
      <RefreshCw className="size-4" aria-hidden="true" />
      {refresh.isPending ? 'Interrogation…' : 'Re-interroger'}
    </Button>
  );
}
