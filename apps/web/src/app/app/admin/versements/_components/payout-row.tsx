'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/business/status-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { useReferralPayout } from '@/lib/api/hooks/use-admin-referrals';
import { PAYOUT_STATUS_LABELS } from '@/lib/enum-labels';
import type { PayoutStatus } from '@/lib/api/types';

const PAYOUT_STATUS_VARIANT: Record<
  PayoutStatus,
  'success' | 'secondary' | 'warning' | 'outline' | 'destructive'
> = {
  PENDING: 'secondary',
  APPROVED: 'secondary',
  PROCESSING: 'warning',
  PAID: 'success',
  FAILED: 'destructive',
  CANCELLED: 'outline',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-CG');
}

/** Une ligne de suivi par versement créé, interrogée individuellement (pas de route de liste). */
export function PayoutRow({ payoutId }: { payoutId: string }) {
  const { data: payout, isLoading } = useReferralPayout(payoutId);

  if (isLoading || !payout) {
    return (
      <TableRow>
        <TableCell colSpan={5}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{payout.id}</TableCell>
      <TableCell>
        <StatusBadge
          status={payout.status}
          labelOverride={PAYOUT_STATUS_LABELS[payout.status]}
          variantOverride={PAYOUT_STATUS_VARIANT[payout.status]}
        />
      </TableCell>
      <TableCell>{payout.commissionsCount}</TableCell>
      <TableCell>
        <MoneyXaf amount={payout.amount} />
      </TableCell>
      <TableCell>{formatDate(payout.paidAt)}</TableCell>
    </TableRow>
  );
}
