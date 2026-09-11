'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/business/page-header';
import { EmptyState } from '@/components/business/empty-state';
import { MoneyXaf } from '@/components/business/money-xaf';
import { CashHoldingGauge } from '@/components/business/cash-holding-gauge';
import { useCashCollectors } from '@/lib/api/hooks/use-cash-collectors';
import { useCashReceipts } from '@/lib/api/hooks/use-cash-receipts';
import { cn } from '@/lib/utils';

function daysSince(dateIso: string | null): number | null {
  if (!dateIso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 86_400_000));
}

export default function CaissePage() {
  const [selectedCollectorId, setSelectedCollectorId] = React.useState<string | null>(null);
  const { data, isLoading } = useCashCollectors();
  const collectors = [...(data?.items ?? [])].sort((a, b) => b.heldAmount - a.heldAmount);

  const receiptsQuery = useCashReceipts({
    collectorUserId: selectedCollectorId ?? undefined,
    status: 'ISSUED',
    limit: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Caisse — démarcheurs"
        description="Encours détenu par chaque démarcheur avant remise à l'agence."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/app/caisse/recus">Reçus de caisse</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/caisse/remises">File de remises à contrôler</Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : collectors.length === 0 ? (
        <EmptyState
          title="Aucun démarcheur"
          description="Aucun reçu de caisse n'a encore été émis."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collectors.map((collector) => (
            <button
              key={collector.userId}
              type="button"
              onClick={() => setSelectedCollectorId(collector.userId)}
              aria-pressed={selectedCollectorId === collector.userId}
              className={cn(
                'rounded-lg border border-border p-4 text-left transition-colors hover:border-primary',
                selectedCollectorId === collector.userId && 'border-primary bg-muted/40',
              )}
            >
              <p className="font-medium">{collector.fullName}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {collector.receiptsCount} reçu{collector.receiptsCount > 1 ? 's' : ''} non remis
                {collector.oldestReceiptAt
                  ? ` · le plus ancien depuis ${daysSince(collector.oldestReceiptAt)} j`
                  : ''}
              </p>
              <CashHoldingGauge heldAmount={collector.heldAmount} capAmount={collector.capAmount} />
            </button>
          ))}
        </div>
      )}

      {selectedCollectorId ? (
        <Card>
          <CardHeader>
            <CardTitle>Reçus non remis</CardTitle>
          </CardHeader>
          <CardContent>
            {receiptsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (receiptsQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun reçu en attente de remise.</p>
            ) : (
              <ul className="divide-y divide-border">
                {receiptsQuery.data!.items.map((receipt) => (
                  <li key={receipt.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {receipt.receiptNumber} — {receipt.tenant.displayName}
                    </span>
                    <MoneyXaf amount={receipt.amount} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
