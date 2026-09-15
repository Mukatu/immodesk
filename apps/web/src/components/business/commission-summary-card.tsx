import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyXaf } from '@/components/business/money-xaf';
import type { CommissionTotals } from '@/lib/api/types';

export interface CommissionSummaryCardProps {
  title: string;
  description?: string;
  totals: CommissionTotals;
  className?: string;
}

/** Cumul des commissions (par mandat ou par période) : base, commission, TVA et total. */
export function CommissionSummaryCard({
  title,
  description,
  totals,
  className,
}: CommissionSummaryCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Loyers encaissés</p>
          <p className="font-medium">
            <MoneyXaf amount={totals.baseAmount} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Commission</p>
          <p className="font-medium">
            <MoneyXaf amount={totals.amount} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">TVA</p>
          <p className="font-medium">
            <MoneyXaf amount={totals.vatAmount} />
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total dû à l&apos;agence</p>
          <p className="font-semibold">
            <MoneyXaf amount={totals.totalAmount} />
          </p>
        </div>
        <p className="col-span-2 text-xs text-muted-foreground sm:col-span-4">
          {totals.count} commission{totals.count > 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
