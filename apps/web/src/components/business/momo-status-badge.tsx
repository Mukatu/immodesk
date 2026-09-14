import type { MomoStatus } from '@/lib/api/types';
import { MOMO_STATUS_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MomoStatusBadgeProps {
  status: MomoStatus;
  className?: string;
}

/**
 * Variant Badge par statut de transaction Mobile Money (déclarée ou agrégateur).
 * SUCCEEDED = succès, FAILED/REJECTED/EXPIRED = échec, PENDING/INITIATED/DECLARED
 * = en cours, CANCELLED/REFUNDED = neutre.
 */
const MOMO_STATUS_VARIANTS: Record<MomoStatus, NonNullable<BadgeProps['variant']>> = {
  INITIATED: 'outline',
  PENDING: 'warning',
  DECLARED: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'destructive',
  EXPIRED: 'destructive',
  CANCELLED: 'outline',
  REJECTED: 'destructive',
  REFUNDED: 'outline',
};

/** Badge de statut d'une transaction Mobile Money, avec libellé fr-CG. */
export function MomoStatusBadge({ status, className }: MomoStatusBadgeProps) {
  return (
    <Badge variant={MOMO_STATUS_VARIANTS[status]} className={cn(className)}>
      {MOMO_STATUS_LABELS[status]}
    </Badge>
  );
}
