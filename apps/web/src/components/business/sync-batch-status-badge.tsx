import type { SyncBatchStatus } from '@/lib/api/types';
import { SYNC_BATCH_STATUS_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';

export interface SyncBatchStatusBadgeProps {
  status: SyncBatchStatus;
  className?: string;
}

const SYNC_BATCH_STATUS_VARIANTS: Record<SyncBatchStatus, NonNullable<BadgeProps['variant']>> = {
  APPLIED: 'success',
  PARTIALLY_APPLIED: 'warning',
  REJECTED: 'destructive',
  FAILED: 'destructive',
};

/** Badge de statut d'un lot de synchronisation, avec libellé fr-CG. */
export function SyncBatchStatusBadge({ status, className }: SyncBatchStatusBadgeProps) {
  return (
    <Badge variant={SYNC_BATCH_STATUS_VARIANTS[status]} className={className}>
      {SYNC_BATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
