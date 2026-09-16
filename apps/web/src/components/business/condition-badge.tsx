import { Badge, type BadgeProps } from '@/components/ui/badge';
import { INSPECTION_CONDITION_LABELS } from '@/lib/enum-labels';
import type { InspectionCondition } from '@/lib/api/types';

const CONDITION_VARIANT: Record<InspectionCondition, NonNullable<BadgeProps['variant']>> = {
  NEW: 'success',
  GOOD: 'success',
  FAIR: 'secondary',
  POOR: 'warning',
  DAMAGED: 'destructive',
  MISSING: 'destructive',
};

export interface ConditionBadgeProps {
  condition: InspectionCondition;
  className?: string;
}

/** Badge d'état d'un élément d'état des lieux : couleur + libellé fr-CG toujours affiché. */
export function ConditionBadge({ condition, className }: ConditionBadgeProps) {
  return (
    <Badge variant={CONDITION_VARIANT[condition]} className={className}>
      {INSPECTION_CONDITION_LABELS[condition]}
    </Badge>
  );
}
