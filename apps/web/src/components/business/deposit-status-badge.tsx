import { Badge, type BadgeProps } from '@/components/ui/badge';
import { DEPOSIT_STATUS_LABELS } from '@/lib/enum-labels';
import type { DepositStatus } from '@/lib/api/types';

const DEPOSIT_STATUS_VARIANT: Record<DepositStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'outline',
  PARTIALLY_PAID: 'warning',
  HELD: 'success',
  PARTIALLY_REFUNDED: 'warning',
  REFUNDED: 'secondary',
  FORFEITED: 'destructive',
};

export interface DepositStatusBadgeProps {
  status: DepositStatus;
  className?: string;
}

/** Badge de statut de dépôt de garantie : couleur par statut, libellé fr-CG toujours affiché. */
export function DepositStatusBadge({ status, className }: DepositStatusBadgeProps) {
  return (
    <Badge variant={DEPOSIT_STATUS_VARIANT[status]} className={className}>
      {DEPOSIT_STATUS_LABELS[status]}
    </Badge>
  );
}
