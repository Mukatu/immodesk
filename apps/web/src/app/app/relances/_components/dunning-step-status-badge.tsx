import { Badge, type BadgeProps } from '@/components/ui/badge';
import { DUNNING_STEP_STATUS_LABELS } from '@/lib/enum-labels';
import type { DunningStepStatus } from '@/lib/api/types';

const STATUS_VARIANT: Record<DunningStepStatus, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'outline',
  RUNNING: 'secondary',
  SENT: 'success',
  SKIPPED: 'warning',
  FAILED: 'destructive',
  CANCELLED: 'outline',
};

export interface DunningStepStatusBadgeProps {
  status: DunningStepStatus;
  className?: string;
}

/**
 * Badge de statut d'une exécution de relance : exactement les six statuts du
 * contrat phase 9 (PENDING, RUNNING, SENT, SKIPPED, FAILED, CANCELLED). Il
 * n'existe pas de statut DELIVERED : la remise se lit dans le journal des
 * messages, jamais ici.
 */
export function DunningStepStatusBadge({ status, className }: DunningStepStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {DUNNING_STEP_STATUS_LABELS[status]}
    </Badge>
  );
}
