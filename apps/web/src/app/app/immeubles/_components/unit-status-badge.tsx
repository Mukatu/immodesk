import { Badge, type BadgeProps } from '@/components/ui/badge';
import { UNIT_STATUS_LABELS } from '@/lib/enum-labels';
import type { UnitStatus } from '@/lib/api/types';

const UNIT_STATUS_VARIANT: Record<UnitStatus, NonNullable<BadgeProps['variant']>> = {
  AVAILABLE: 'success',
  OCCUPIED: 'secondary',
  RESERVED: 'warning',
  UNDER_MAINTENANCE: 'warning',
  UNAVAILABLE: 'outline',
};

export interface UnitStatusBadgeProps {
  status: UnitStatus;
  className?: string;
}

/** Badge de statut de lot : couleur par statut, libellé fr-CG toujours affiché. */
export function UnitStatusBadge({ status, className }: UnitStatusBadgeProps) {
  return (
    <Badge variant={UNIT_STATUS_VARIANT[status]} className={className}>
      {UNIT_STATUS_LABELS[status]}
    </Badge>
  );
}
