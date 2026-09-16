import { Badge, type BadgeProps } from '@/components/ui/badge';
import { INSPECTION_STATUS_LABELS } from '@/lib/enum-labels';
import type { InspectionStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const INSPECTION_STATUS_VARIANT: Record<InspectionStatus, NonNullable<BadgeProps['variant']>> = {
  DRAFT: 'outline',
  IN_PROGRESS: 'default',
  PENDING_SIGNATURE: 'warning',
  SIGNED: 'success',
  DISPUTED: 'destructive',
  CANCELLED: 'outline',
};

export interface InspectionStatusBadgeProps {
  status: InspectionStatus;
  className?: string;
}

/** Badge de statut d'état des lieux (6 statuts du contrat) : couleur + libellé fr-CG toujours affiché. */
export function InspectionStatusBadge({ status, className }: InspectionStatusBadgeProps) {
  return (
    <Badge
      variant={INSPECTION_STATUS_VARIANT[status]}
      className={cn(status === 'CANCELLED' && 'line-through opacity-70', className)}
    >
      {INSPECTION_STATUS_LABELS[status]}
    </Badge>
  );
}
