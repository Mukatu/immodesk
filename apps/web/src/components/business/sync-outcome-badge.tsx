import type { SyncOperationOutcome } from '@/lib/api/types';
import { SYNC_OPERATION_OUTCOME_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';

export interface SyncOutcomeBadgeProps {
  outcome: SyncOperationOutcome;
  className?: string;
}

const SYNC_OUTCOME_VARIANTS: Record<SyncOperationOutcome, NonNullable<BadgeProps['variant']>> = {
  APPLIED: 'success',
  DUPLICATE: 'secondary',
  REJECTED: 'destructive',
  CONFLICT: 'warning',
  SKIPPED: 'outline',
};

/** Badge d'issue d'une opération d'un lot de synchronisation, avec libellé fr-CG. */
export function SyncOutcomeBadge({ outcome, className }: SyncOutcomeBadgeProps) {
  return (
    <Badge variant={SYNC_OUTCOME_VARIANTS[outcome]} className={className}>
      {SYNC_OPERATION_OUTCOME_LABELS[outcome]}
    </Badge>
  );
}
