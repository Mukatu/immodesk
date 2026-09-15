import type { CheckStatus } from '@/lib/api/types';
import { CHECK_STATUS_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CheckStatusBadgeProps {
  status: CheckStatus;
  className?: string;
}

const VARIANT_BY_STATUS: Record<CheckStatus, NonNullable<BadgeProps['variant']>> = {
  RECEIVED: 'secondary',
  DEPOSITED: 'warning',
  CLEARED: 'success',
  BOUNCED: 'destructive',
  CANCELLED: 'outline',
  RETURNED: 'outline',
};

/**
 * Badge de statut d'un chèque (`BankCheck.status`, contrat Phase 6). Le
 * libellé fr-CG est toujours affiché : la couleur n'est jamais le seul
 * porteur d'information.
 */
export function CheckStatusBadge({ status, className }: CheckStatusBadgeProps) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={cn(className)}>
      {CHECK_STATUS_LABELS[status]}
    </Badge>
  );
}
