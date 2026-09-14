import { CheckCircle2, AlertTriangle, CircleSlash } from 'lucide-react';

import { formatAgeHours, hoursSince } from '@/lib/aging';
import { cn } from '@/lib/utils';

export interface DeviceFreshnessIndicatorProps {
  /** Date ISO du dernier lot reçu, ou `null` si l'appareil n'a jamais synchronisé. */
  lastBatchAt: string | null;
  className?: string;
}

/** Au-delà, l'appareil est mis en évidence (contrat, écran de supervision). */
export const DEVICE_SILENT_THRESHOLD_HOURS = 24;

/**
 * Indicateur de fraîcheur de synchronisation d'un appareil : jamais la
 * couleur seule, toujours un libellé texte explicite en fr-CG.
 */
export function DeviceFreshnessIndicator({
  lastBatchAt,
  className,
}: DeviceFreshnessIndicatorProps) {
  if (!lastBatchAt) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-sm text-destructive', className)}>
        <CircleSlash className="size-4" aria-hidden="true" />
        Jamais synchronisé
      </span>
    );
  }

  const hours = hoursSince(lastBatchAt);
  const isSilent = hours > DEVICE_SILENT_THRESHOLD_HOURS;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm',
        isSilent ? 'font-medium text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {isSilent ? (
        <AlertTriangle className="size-4" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
      )}
      {isSilent
        ? `Silencieux depuis ${formatAgeHours(hours)}`
        : `Synchronisé il y a ${formatAgeHours(hours)}`}
    </span>
  );
}
