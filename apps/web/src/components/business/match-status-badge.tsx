import type { MatchStatus } from '@/lib/api/types';
import { MATCH_STATUS_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MatchStatusBadgeProps {
  status: MatchStatus;
  className?: string;
}

const VARIANT_BY_STATUS: Record<MatchStatus, NonNullable<BadgeProps['variant']>> = {
  PROPOSED: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'destructive',
  REVERSED: 'outline',
};

/**
 * Badge de statut d'un rapprochement (`ReconciliationMatch.status`, contrat
 * Phase 6). Le libellé fr-CG est toujours affiché : la couleur n'est jamais
 * le seul porteur d'information.
 */
export function MatchStatusBadge({ status, className }: MatchStatusBadgeProps) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={cn(className)}>
      {MATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
