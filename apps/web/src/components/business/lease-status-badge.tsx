import { Badge, type BadgeProps } from '@/components/ui/badge';
import { LEASE_STATUS_LABELS } from '@/lib/enum-labels';
import type { LeaseStatus } from '@/lib/api/types';

const LEASE_STATUS_VARIANT: Record<LeaseStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  PENDING_SIGNATURE: 'secondary',
  ACTIVE: 'success',
  NOTICE_GIVEN: 'warning',
  TERMINATED: 'destructive',
  EXPIRED: 'outline',
  CANCELLED: 'destructive',
};

export interface LeaseStatusBadgeProps {
  status: LeaseStatus;
  className?: string;
}

/** Badge de statut de bail : couleur par statut, libellé fr-CG toujours affiché. */
export function LeaseStatusBadge({ status, className }: LeaseStatusBadgeProps) {
  return (
    <Badge variant={LEASE_STATUS_VARIANT[status]} className={className}>
      {LEASE_STATUS_LABELS[status]}
    </Badge>
  );
}
