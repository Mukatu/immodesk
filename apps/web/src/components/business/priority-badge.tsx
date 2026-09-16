import { Badge, type BadgeProps } from '@/components/ui/badge';
import { MAINTENANCE_PRIORITY_LABELS } from '@/lib/enum-labels';
import type { MaintenancePriority } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const PRIORITY_VARIANT: Record<MaintenancePriority, NonNullable<BadgeProps['variant']>> = {
  LOW: 'outline',
  NORMAL: 'secondary',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export interface PriorityBadgeProps {
  priority: MaintenancePriority;
  className?: string;
}

/**
 * Badge de priorité d'une demande de maintenance : couleur + libellé fr-CG.
 * La priorité URGENT reçoit en plus un style (gras, majuscules, espacement des
 * lettres) pour se distinguer visuellement sans dépendre de la seule couleur.
 */
export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge
      variant={PRIORITY_VARIANT[priority]}
      className={cn(priority === 'URGENT' && 'font-bold uppercase tracking-wide', className)}
    >
      {MAINTENANCE_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
