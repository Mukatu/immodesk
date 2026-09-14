import { AlertTriangle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { AGE_ALERT_THRESHOLD_HOURS, formatAgeHours } from '@/lib/aging';

export interface AgedDeclarationNoticeProps {
  ageHours: number;
  className?: string;
}

/**
 * Indicateur d'ancienneté d'une déclaration en attente : icône + texte
 * (jamais la couleur seule) au-delà de 72 heures, conforme au contrat phase 4
 * (« une déclaration de virement non traitée depuis plus de 72 heures
 * ouvrées apparaît en tête de file avec un indicateur d'ancienneté »),
 * appliqué aussi à Mobile Money par cohérence.
 */
export function AgedDeclarationNotice({ ageHours, className }: AgedDeclarationNoticeProps) {
  if (ageHours <= AGE_ALERT_THRESHOLD_HOURS) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {formatAgeHours(ageHours)}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium text-destructive',
        className,
      )}
    >
      <AlertTriangle className="size-4" aria-hidden="true" />
      {formatAgeHours(ageHours)} — dépasse 72 h
    </span>
  );
}
