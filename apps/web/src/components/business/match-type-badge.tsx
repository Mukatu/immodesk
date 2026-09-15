import type { MatchType } from '@/lib/api/types';
import { MATCH_TYPE_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MatchTypeBadgeProps {
  matchType: MatchType;
  className?: string;
}

const VARIANT_BY_MATCH_TYPE: Record<MatchType, NonNullable<BadgeProps['variant']>> = {
  EXACT: 'success',
  SUGGESTED: 'warning',
  MANUAL: 'secondary',
  PARTIAL: 'warning',
  SPLIT: 'warning',
};

/**
 * Badge de type de rapprochement (`ReconciliationMatch.matchType`, contrat
 * Phase 6). Le libellé fr-CG est toujours affiché : la couleur n'est jamais
 * le seul porteur d'information.
 */
export function MatchTypeBadge({ matchType, className }: MatchTypeBadgeProps) {
  return (
    <Badge variant={VARIANT_BY_MATCH_TYPE[matchType]} className={cn(className)}>
      {MATCH_TYPE_LABELS[matchType]}
    </Badge>
  );
}
