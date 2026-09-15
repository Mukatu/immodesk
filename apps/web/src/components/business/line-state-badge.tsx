import type { LineState } from '@/lib/api/types';
import { LINE_STATE_LABELS } from '@/lib/enum-labels';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface LineStateBadgeProps {
  state: LineState;
  className?: string;
}

const VARIANT_BY_STATE: Record<LineState, NonNullable<BadgeProps['variant']>> = {
  MATCHED: 'success',
  SUGGESTED: 'warning',
  PARTIALLY_MATCHED: 'warning',
  UNMATCHED: 'secondary',
  IGNORED: 'outline',
};

/**
 * Badge d'état d'une ligne de relevé bancaire (`StatementLine.state`, contrat
 * Phase 6). Le libellé fr-CG est toujours affiché : la couleur n'est jamais
 * le seul porteur d'information.
 */
export function LineStateBadge({ state, className }: LineStateBadgeProps) {
  return (
    <Badge variant={VARIANT_BY_STATE[state]} className={cn(className)}>
      {LINE_STATE_LABELS[state]}
    </Badge>
  );
}
