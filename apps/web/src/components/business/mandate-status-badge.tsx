import { Badge, type BadgeProps } from '@/components/ui/badge';
import { MANDATE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MandateStatus } from '@/lib/api/types';

const MANDATE_STATUS_VARIANT: Record<MandateStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  TERMINATED: 'destructive',
  EXPIRED: 'outline',
};

export interface MandateStatusBadgeProps {
  status: MandateStatus;
  className?: string;
}

/** Badge de statut de mandat de gestion : couleur par statut, libellé fr-CG toujours affiché. */
export function MandateStatusBadge({ status, className }: MandateStatusBadgeProps) {
  return (
    <Badge variant={MANDATE_STATUS_VARIANT[status]} className={className}>
      {MANDATE_STATUS_LABELS[status]}
    </Badge>
  );
}
