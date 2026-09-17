import { AlertTriangle } from 'lucide-react';

import type { MaintenanceStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { formatDateFr } from './format-date-fr';

/**
 * Statuts pour lesquels une échéance dépassée n'est plus un retard (contrat
 * phase 8, tableau des étapes de maintenance) : la demande est déjà terminée.
 */
const TERMINAL_STATUSES = new Set<MaintenanceStatus>(['RESOLVED', 'CLOSED', 'REJECTED']);

/**
 * Une demande est en retard quand son échéance cible (`slaDueAt`) est dépassée
 * et qu'elle n'est ni résolue, ni close, ni rejetée. Prend `now` en paramètre :
 * jamais de lecture de la date courante ici, pour rester testable avec une date
 * de référence fixe (piège déjà rencontré sur ce projet).
 */
export function isMaintenanceOverdue(
  slaDueAt: string | null,
  status: MaintenanceStatus,
  now: Date,
): boolean {
  if (!slaDueAt || TERMINAL_STATUSES.has(status)) return false;
  return new Date(slaDueAt).getTime() < now.getTime();
}

export interface MaintenanceDueIndicatorProps {
  slaDueAt: string | null;
  status: MaintenanceStatus;
  /** Date de référence pour le calcul du retard, injectée par l'appelant. */
  now: Date;
  className?: string;
}

/**
 * Échéance cible d'une demande de maintenance, avec mise en évidence visuelle
 * (icône + texte, jamais la seule couleur) quand elle est dépassée.
 */
export function MaintenanceDueIndicator({
  slaDueAt,
  status,
  now,
  className,
}: MaintenanceDueIndicatorProps) {
  if (!slaDueAt) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>;
  }

  const overdue = isMaintenanceOverdue(slaDueAt, status, now);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm',
        overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {overdue ? <AlertTriangle className="size-4" aria-hidden="true" /> : null}
      {formatDateFr(slaDueAt)}
      {overdue ? ' — en retard' : ''}
    </span>
  );
}
