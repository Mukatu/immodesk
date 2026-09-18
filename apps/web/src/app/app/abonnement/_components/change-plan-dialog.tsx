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
} from '@/components/ui/dialog';
import { MoneyXaf } from '@/components/business/money-xaf';
import { cn } from '@/lib/utils';
import { useSubscribeOrganization, useSubscriptionPlans } from '@/lib/api/hooks/use-subscriptions';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { BILLING_INTERVAL_LABELS } from '@/lib/enum-labels';

export interface ChangePlanDialogProps {
  open: boolean;
  organizationId: string;
  currentPlanId: string | null;
  onClose: () => void;
}

/**
 * Souscription initiale ou changement de plan : une seule ligne d'abonnement
 * par organisation, `POST /organizations/{id}/subscription` fait donc les
 * deux selon qu'une ligne existe déjà (arbitrage n°1 du contrat phase 10).
 */
export function ChangePlanDialog({
  open,
  organizationId,
  currentPlanId,
  onClose,
}: ChangePlanDialogProps) {
  const { data } = useSubscriptionPlans();
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const subscribe = useSubscribeOrganization(organizationId);

  const plans = data?.items ?? [];

  React.useEffect(() => {
    if (open) {
      setSelectedPlanId(currentPlanId);
      setError(null);
    }
  }, [open, currentPlanId]);

  async function handleConfirm() {
    if (!selectedPlanId) {
      setError('Sélectionnez un plan.');
      return;
    }
    setError(null);
    try {
      await subscribe.mutateAsync({ planId: selectedPlanId });
      toast.success('Abonnement mis à jour.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-2" role="radiogroup" aria-label="Plans disponibles">
          {plans.map((plan) => {
            const selected = plan.id === selectedPlanId;
            const isCurrent = plan.id === currentPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedPlanId(plan.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:border-primary/60',
                  selected && 'border-primary ring-1 ring-primary',
                )}
              >
                <div>
                  <p className="font-medium">
                    {plan.name}{' '}
                    {isCurrent ? (
                      <span className="text-xs text-muted-foreground">(plan actuel)</span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {BILLING_INTERVAL_LABELS[plan.billingInterval]} — {plan.includedUnits} lots
                    inclus, puis <MoneyXaf amount={plan.perUnitPrice} />
                    /lot
                  </p>
                </div>
                <MoneyXaf amount={plan.basePrice} className="font-semibold" />
              </button>
            );
          })}
        </div>

        {error ? (
          <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={subscribe.isPending || !selectedPlanId || selectedPlanId === currentPlanId}
          >
            {subscribe.isPending ? 'Enregistrement…' : 'Confirmer le changement de plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
