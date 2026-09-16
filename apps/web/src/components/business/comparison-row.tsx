import { ConditionBadge } from '@/components/business/condition-badge';
import { MoneyXaf } from '@/components/business/money-xaf';
import { cn } from '@/lib/utils';
import type { InspectionCondition } from '@/lib/api/types';

/** Ordre de sévérité croissant : index plus élevé = état qui se dégrade. */
const SEVERITY_ORDER: InspectionCondition[] = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'MISSING'];

export interface ComparisonRowProps {
  /** Libellé du poste comparé (ex: "Peinture salon", "Robinetterie cuisine"). */
  label: string;
  conditionIn: InspectionCondition;
  conditionOut: InspectionCondition;
  /** Montant de retenue proposé sur le dépôt de garantie, s'il y en a un. */
  deductionAmount?: number | null;
  className?: string;
}

/**
 * Ligne de comparaison état d'entrée / état de sortie pour un poste d'état des lieux.
 * Met en évidence visuellement l'écart : fond rouge léger en cas de dégradation
 * (l'état de sortie est strictement pire que l'état d'entrée), fond orange léger
 * pour tout autre écart, sans mise en évidence si les deux états sont identiques.
 */
export function ComparisonRow({
  label,
  conditionIn,
  conditionOut,
  deductionAmount,
  className,
}: ComparisonRowProps) {
  const hasGap = conditionIn !== conditionOut;
  const isDegradation = SEVERITY_ORDER.indexOf(conditionOut) > SEVERITY_ORDER.indexOf(conditionIn);

  const ariaLabel = isDegradation
    ? `Dégradation détectée pour ${label}`
    : hasGap
      ? `Écart détecté pour ${label}`
      : undefined;

  return (
    <div
      role="row"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-3 rounded-md p-2',
        isDegradation && 'bg-destructive/10',
        hasGap && !isDegradation && 'bg-warning/10',
        className,
      )}
    >
      <div role="cell" className="flex-1 font-medium">
        {label}
      </div>
      <div role="cell">
        <ConditionBadge condition={conditionIn} />
      </div>
      <div role="cell" aria-hidden="true">
        →
      </div>
      <div role="cell">
        <ConditionBadge condition={conditionOut} />
      </div>
      {typeof deductionAmount === 'number' && deductionAmount > 0 && (
        <div role="cell" className="text-destructive font-medium">
          Retenue proposée : <MoneyXaf amount={deductionAmount} />
        </div>
      )}
    </div>
  );
}
