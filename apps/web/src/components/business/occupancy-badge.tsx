import type { Occupancy } from '@/lib/api/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type OccupancyBadgeProps =
  | { occupancy: Occupancy; rateBps?: never; className?: string }
  | { rateBps: number; occupancy?: never; className?: string };

/**
 * Badge de taux d'occupation d'un bien : succès (>=80%), avertissement (>=40%),
 * critique (<40%). Le libellé texte "{n} % occupé" est toujours affiché : la
 * couleur n'est jamais le seul porteur d'information.
 */
export function OccupancyBadge(props: OccupancyBadgeProps) {
  const { className } = props;
  const unitsCount = props.occupancy?.unitsCount;

  if (unitsCount === 0) {
    return (
      <Badge variant="outline" className={cn(className)}>
        —
      </Badge>
    );
  }

  const rateBps = props.rateBps ?? props.occupancy?.occupancyRateBps ?? 0;
  const pct = Math.round(rateBps / 100);
  const variant = pct >= 80 ? 'success' : pct >= 40 ? 'warning' : 'destructive';

  return (
    <Badge variant={variant} className={cn(className)}>
      {pct} % occupé
    </Badge>
  );
}
