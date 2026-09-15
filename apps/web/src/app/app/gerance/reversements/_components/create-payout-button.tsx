'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCreateOwnerPayout } from '@/lib/api/hooks/use-owner-payouts';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';

export interface CreatePayoutButtonProps {
  statementId: string;
  netPayableAmount: number;
}

/** Création d'un reversement sur un relevé émis (ou envoyé) au solde strictement positif. */
export function CreatePayoutButton({ statementId, netPayableAmount }: CreatePayoutButtonProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const createPayout = useCreateOwnerPayout();

  if (netPayableAmount <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Solde non positif : aucun reversement possible, le solde sera reporté au relevé suivant.
      </p>
    );
  }

  async function handleCreate() {
    setError(null);
    try {
      const payout = await createPayout.mutateAsync({ statementId });
      toast.success('Reversement créé.');
      router.push(`/app/gerance/reversements?highlight=${payout.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={handleCreate} disabled={createPayout.isPending}>
        {createPayout.isPending ? 'Création…' : 'Créer le reversement'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
