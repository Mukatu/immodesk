import { Badge, type BadgeProps } from '@/components/ui/badge';
import { MAINTENANCE_STATUS_LABELS } from '@/lib/enum-labels';
import type { MaintenanceStatus } from '@/lib/api/types';

const MAINTENANCE_STATUS_VARIANT: Record<MaintenanceStatus, NonNullable<BadgeProps['variant']>> = {
  OPEN: 'warning',
  ACKNOWLEDGED: 'secondary',
  ASSIGNED: 'secondary',
  IN_PROGRESS: 'default',
  ON_HOLD: 'outline',
  RESOLVED: 'success',
  CLOSED: 'outline',
  REJECTED: 'destructive',
};

export interface MaintenanceStatusBadgeProps {
  status: MaintenanceStatus;
  className?: string;
}

/** Badge de statut d'une demande de maintenance (8 statuts du contrat) : couleur + libellé fr-CG toujours affiché. */
export function MaintenanceStatusBadge({ status, className }: MaintenanceStatusBadgeProps) {
  return (
    <Badge variant={MAINTENANCE_STATUS_VARIANT[status]} className={className}>
      {MAINTENANCE_STATUS_LABELS[status]}
    </Badge>
  );
}
