import { Badge, type BadgeProps } from '@/components/ui/badge';
import { REMITTANCE_STATUS_LABELS } from '@/lib/enum-labels';
import type { RemittanceStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const REMITTANCE_STATUS_VARIANT: Record<RemittanceStatus, NonNullable<BadgeProps['variant']>> = {
  OPEN: 'outline',
  SUBMITTED: 'warning',
  VERIFIED: 'secondary',
  DEPOSITED: 'success',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
};

export interface RemittanceStatusBadgeProps {
  status: RemittanceStatus;
  className?: string;
}

/** Badge de statut de remise d'espèces (6 statuts du contrat) : couleur + libellé fr-CG toujours affiché. */
export function RemittanceStatusBadge({ status, className }: RemittanceStatusBadgeProps) {
  return (
    <Badge
      variant={REMITTANCE_STATUS_VARIANT[status]}
      className={cn(status === 'CANCELLED' && 'line-through opacity-70', className)}
    >
      {REMITTANCE_STATUS_LABELS[status]}
    </Badge>
  );
}
