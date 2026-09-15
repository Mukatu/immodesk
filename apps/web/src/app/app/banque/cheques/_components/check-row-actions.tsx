'use client';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  useCancelBankCheck,
  useClearBankCheck,
  useReturnBankCheck,
} from '@/lib/api/hooks/use-bank-checks';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { BankCheck } from '@/lib/api/types';
import { DepositCheckDialog } from './deposit-check-dialog';
import { BounceCheckDialog } from './bounce-check-dialog';

export interface CheckRowActionsProps {
  check: BankCheck;
}

/**
 * Actions par ligne selon le statut courant du chèque (`CheckStatus`) :
 * - RECEIVED : déposer, restituer au tireur, annuler ;
 * - DEPOSITED : compenser, rejeter (impayé) ;
 * - BOUNCED : restituer au tireur (le chèque rejeté peut être rendu) ;
 * - CLEARED, CANCELLED, RETURNED : aucune action, statuts terminaux.
 */
export function CheckRowActions({ check }: CheckRowActionsProps) {
  const clearCheck = useClearBankCheck(check.id);
  const cancelCheck = useCancelBankCheck(check.id);
  const returnCheck = useReturnBankCheck(check.id);

  async function handleClear() {
    try {
      await clearCheck.mutateAsync({});
      toast.success('Chèque compensé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleCancel() {
    try {
      await cancelCheck.mutateAsync();
      toast.success('Chèque annulé.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  async function handleReturn() {
    try {
      await returnCheck.mutateAsync();
      toast.success('Chèque restitué au tireur.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  if (check.status === 'RECEIVED') {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <DepositCheckDialog checkId={check.id} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReturn}
          disabled={returnCheck.isPending}
        >
          Restituer au tireur
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={cancelCheck.isPending}
        >
          Annuler
        </Button>
      </div>
    );
  }

  if (check.status === 'DEPOSITED') {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" onClick={handleClear} disabled={clearCheck.isPending}>
          Compenser
        </Button>
        <BounceCheckDialog checkId={check.id} />
      </div>
    );
  }

  if (check.status === 'BOUNCED') {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReturn}
          disabled={returnCheck.isPending}
        >
          Restituer au tireur
        </Button>
      </div>
    );
  }

  return null;
}
