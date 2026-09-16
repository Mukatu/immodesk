import type { MaintenanceStatus } from '@/lib/api/types';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SlaIndicatorProps {
  slaDueAt: string | null;
  status: MaintenanceStatus;
  /** Date de référence pour le calcul (utile pour les tests). Par défaut : maintenant. */
  now?: string | Date;
  className?: string;
}

export type SlaLevel = 'OVERDUE' | 'AT_RISK' | 'ON_TRACK' | 'CLOSED' | 'NONE';

export interface SlaLevelResult {
  level: SlaLevel;
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const CLOSED_STATUSES: ReadonlySet<MaintenanceStatus> = new Set(['RESOLVED', 'CLOSED', 'REJECTED']);

const RISK_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Calcule le niveau d'échéance SLA d'une demande de maintenance.
 *
 * - Statut clôturé (RESOLVED, CLOSED, REJECTED) : niveau CLOSED, quel que
 *   soit `slaDueAt` — une demande fermée n'affiche jamais de dépassement.
 * - `slaDueAt` absent (et statut actif) : niveau NONE ("Sans échéance").
 * - Échéance déjà passée : niveau OVERDUE ("Dépassé").
 * - Échéance dans moins de 24 h (fenêtre de risque fixe, indépendante de la
 *   priorité) : niveau AT_RISK ("À risque").
 * - Sinon : niveau ON_TRACK ("Dans les délais").
 */
export function getSlaLevel({ slaDueAt, status, now }: SlaIndicatorProps): SlaLevelResult {
  if (CLOSED_STATUSES.has(status)) {
    return { level: 'CLOSED', label: 'Clôturé', variant: 'outline' };
  }

  if (slaDueAt === null) {
    return { level: 'NONE', label: 'Sans échéance', variant: 'outline' };
  }

  const dueDate = new Date(slaDueAt);
  const reference = now ? new Date(now) : new Date();
  const diffMs = dueDate.getTime() - reference.getTime();

  if (diffMs < 0) {
    return { level: 'OVERDUE', label: 'Dépassé', variant: 'destructive' };
  }

  if (diffMs <= RISK_WINDOW_MS) {
    return { level: 'AT_RISK', label: 'À risque', variant: 'warning' };
  }

  return { level: 'ON_TRACK', label: 'Dans les délais', variant: 'success' };
}

/**
 * Badge d'échéance SLA d'une demande de maintenance : "Dépassé" (échéance
 * passée), "À risque" (moins de 24 h restantes), "Dans les délais",
 * "Sans échéance" ou "Clôturé" (demande RESOLVED/CLOSED/REJECTED, où le
 * dépassement n'est plus pertinent).
 */
export function SlaIndicator({ slaDueAt, status, now, className }: SlaIndicatorProps) {
  const { label, variant } = getSlaLevel({ slaDueAt, status, now });

  return (
    <Badge variant={variant} role="status" aria-label={label} className={cn(className)}>
      {label}
    </Badge>
  );
}
