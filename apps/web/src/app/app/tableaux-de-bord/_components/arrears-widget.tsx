'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExportButton } from '@/components/business/export-button';
import { MoneyXaf } from '@/components/business/money-xaf';
import { PhoneDisplay } from '@/components/business/phone-display';
import { useArrearsDashboard } from '@/lib/api/hooks/use-dashboards';
import type { ArrearsDashboardQuery } from '@/lib/api/types';

const BUCKET_LABELS: Record<string, string> = {
  '0-30': '0 à 30 jours',
  '31-60': '31 à 60 jours',
  '61-90': '61 à 90 jours',
  '90+': 'Plus de 90 jours',
};

export interface ArrearsWidgetProps {
  filters: ArrearsDashboardQuery;
}

/** Impayés : total, répartition par tranche d'ancienneté et locataires les plus en retard. */
export function ArrearsWidget({ filters }: ArrearsWidgetProps) {
  const { data, isLoading } = useArrearsDashboard(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Impayés</CardTitle>
        <ExportButton kind="arrears" filters={{ widget: 'arrears', ...filters }} />
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data ? (
          <>
            <p className="text-lg font-semibold">
              <MoneyXaf amount={data.totalAmount} /> sur {data.invoicesCount} facture
              {data.invoicesCount > 1 ? 's' : ''}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tranche</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Factures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.buckets.map((bucket) => (
                  <TableRow key={bucket.label}>
                    <TableCell>{BUCKET_LABELS[bucket.label]}</TableCell>
                    <TableCell>
                      <MoneyXaf amount={bucket.amount} />
                    </TableCell>
                    <TableCell>{bucket.invoicesCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.topDebtors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Locataires les plus en retard</p>
                <ul className="space-y-1 text-sm">
                  {data.topDebtors.map((debtor) => (
                    <li key={debtor.tenantId} className="flex items-center justify-between gap-2">
                      <span>
                        {debtor.displayName} — <PhoneDisplay phone={debtor.phone} />
                      </span>
                      <span className="font-medium">
                        <MoneyXaf amount={debtor.amount} /> ({debtor.daysOverdue} j)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
