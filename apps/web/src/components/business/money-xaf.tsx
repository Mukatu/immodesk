import { cn } from '@/lib/utils';
import { formatXaf } from '@/lib/money';

export interface MoneyXafProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number | bigint;
  /** Applique la couleur de succès/erreur selon le signe. Désactivé par défaut. */
  colorize?: boolean;
}

/** Affiche un montant XAF entier, formaté « 150 000 XAF » (jamais de décimale). */
export function MoneyXaf({ amount, colorize = false, className, ...props }: MoneyXafProps) {
  const isNegative = amount < 0;
  return (
    <span
      className={cn(
        'tabular-nums',
        colorize && isNegative && 'text-destructive',
        colorize && !isNegative && 'text-success',
        className,
      )}
      {...props}
    >
      {formatXaf(amount)}
    </span>
  );
}
