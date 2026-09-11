import { MoneyXaf } from '@/components/business/money-xaf';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface CashHoldingGaugeProps {
  /** Montant actuellement détenu par le démarcheur (reçus ISSUED non remis). */
  heldAmount: number;
  /** Plafond de caisse au-delà duquel une alerte est affichée (pas de blocage). */
  capAmount: number;
  className?: string;
}

/**
 * Jauge encours de caisse vs plafond. Le dépassement est toujours signalé par un
 * texte explicite ("Plafond dépassé") en plus de la couleur, jamais par la seule couleur.
 */
export function CashHoldingGauge({ heldAmount, capAmount, className }: CashHoldingGaugeProps) {
  const overCap = capAmount > 0 && heldAmount > capAmount;
  const pct = capAmount > 0 ? Math.round((heldAmount / capAmount) * 100) : 0;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className={cn('font-medium tabular-nums', overCap && 'text-destructive')}>
          <MoneyXaf amount={heldAmount} />
        </span>
        <span className="text-xs text-muted-foreground">
          plafond <MoneyXaf amount={capAmount} />
        </span>
      </div>
      <Progress
        value={heldAmount}
        max={capAmount || heldAmount || 1}
        className={cn(overCap && 'bg-destructive/20')}
      />
      <p
        className={cn(
          'text-xs',
          overCap ? 'font-medium text-destructive' : 'text-muted-foreground',
        )}
      >
        {overCap ? `Plafond dépassé (${pct} %)` : `${pct} % du plafond`}
      </p>
    </div>
  );
}
