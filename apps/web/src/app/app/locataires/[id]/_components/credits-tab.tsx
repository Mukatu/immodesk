'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenantCredits } from '@/lib/api/hooks/use-tenant-credits';
import { CREDIT_STATUS_LABELS } from '@/lib/enum-labels';
import type { CreditStatus, TenantCredit } from '@/lib/api/types';
import { ApplyCreditDialog } from './apply-credit-dialog';

const CREDIT_STATUS_VARIANT: Record<CreditStatus, 'outline' | 'secondary' | 'success' | 'warning'> =
  {
    OPEN: 'success',
    PARTIALLY_USED: 'warning',
    USED: 'secondary',
    REFUNDED: 'outline',
    EXPIRED: 'outline',
  };

export interface CreditsTabProps {
  tenantId: string;
}

/** Onglet « Crédits » de la fiche locataire : trop-perçus disponibles et leur application. */
export function CreditsTab({ tenantId }: CreditsTabProps) {
  const { data, isLoading } = useTenantCredits(tenantId);
  const [applying, setApplying] = React.useState<TenantCredit | null>(null);
  const items = data?.items ?? [];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun crédit"
        description="Ce locataire n'a pas de trop-perçu en attente."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Restant disponible :{' '}
        <MoneyXaf amount={data?.remainingAmount ?? 0} className="font-medium" />
      </p>
      <ul className="space-y-2">
        {items.map((credit) => (
          <li
            key={credit.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MoneyXaf amount={credit.remainingAmount} className="font-medium" />
                <Badge variant={CREDIT_STATUS_VARIANT[credit.status]}>
                  {CREDIT_STATUS_LABELS[credit.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Origine : {credit.origin} — total <MoneyXaf amount={credit.amount} />
              </p>
            </div>
            {credit.status === 'OPEN' || credit.status === 'PARTIALLY_USED' ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setApplying(credit)}>
                Appliquer à une facture
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <ApplyCreditDialog
        tenantId={tenantId}
        credit={applying}
        onOpenChange={(open) => !open && setApplying(null)}
      />
    </div>
  );
}
