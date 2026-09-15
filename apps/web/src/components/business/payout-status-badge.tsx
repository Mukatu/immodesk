import { Badge, type BadgeProps } from '@/components/ui/badge';
import { PAYOUT_STATUS_LABELS } from '@/lib/enum-labels';
import type { PayoutStatus } from '@/lib/api/types';

const PAYOUT_STATUS_VARIANT: Record<PayoutStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'outline',
  APPROVED: 'secondary',
  PROCESSING: 'warning',
  PAID: 'success',
  FAILED: 'destructive',
  CANCELLED: 'destructive',
};

export interface PayoutStatusBadgeProps {
  status: PayoutStatus;
  className?: string;
}

/** Badge de statut de reversement au bailleur : couleur par statut, libellé fr-CG toujours affiché. */
export function PayoutStatusBadge({ status, className }: PayoutStatusBadgeProps) {
  return (
    <Badge variant={PAYOUT_STATUS_VARIANT[status]} className={className}>
      {PAYOUT_STATUS_LABELS[status]}
    </Badge>
  );
}
