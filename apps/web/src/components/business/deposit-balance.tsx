import { cn } from '@/lib/utils';
import { formatXaf } from '@/lib/money';
import { MoneyXaf } from '@/components/business/money-xaf';

export interface DepositBalanceProps {
  deposit: {
    requiredAmount: number;
    collectedAmount: number;
    deductedAmount: number;
    refundedAmount: number;
    heldAmount: number;
  };
  className?: string;
}

/**
 * Barre empilée du solde d'un dépôt de garantie : requis restant / retenu /
 * retenue déduite / restitué. La couleur n'est jamais le seul porteur
 * d'information : les montants texte sont toujours visibles dans la légende.
 */
export function DepositBalance({ deposit, className }: DepositBalanceProps) {
  const { requiredAmount, collectedAmount, deductedAmount, refundedAmount, heldAmount } = deposit;
  const requiredRemaining = Math.max(0, requiredAmount - collectedAmount);
  const total = Math.max(requiredAmount, collectedAmount, 1);
  const pct = (value: number) => `${Math.min(100, Math.max(0, (value / total) * 100))}%`;

  const ariaLabel = `Dépôt : ${formatXaf(requiredAmount)} requis, ${formatXaf(collectedAmount)} encaissé, ${formatXaf(heldAmount)} retenu, ${formatXaf(refundedAmount)} restitué`;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="bg-muted-foreground/30" style={{ width: pct(requiredRemaining) }} />
        <div className="bg-success" style={{ width: pct(heldAmount) }} />
        <div className="bg-destructive" style={{ width: pct(deductedAmount) }} />
        <div className="bg-secondary" style={{ width: pct(refundedAmount) }} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Requis</dt>
          <dd className="font-medium">
            <MoneyXaf amount={requiredAmount} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Encaissé</dt>
          <dd className="font-medium">
            <MoneyXaf amount={collectedAmount} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Retenu</dt>
          <dd className="font-medium">
            <MoneyXaf amount={heldAmount} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Restitué</dt>
          <dd className="font-medium">
            <MoneyXaf amount={refundedAmount} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
