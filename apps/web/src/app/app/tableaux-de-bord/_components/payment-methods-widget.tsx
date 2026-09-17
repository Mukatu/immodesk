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
import { PAYMENT_METHOD_LABELS } from '@/lib/enum-labels';
import { usePaymentMethodsDashboard } from '@/lib/api/hooks/use-dashboards';
import type { PaymentMethodsDashboardQuery } from '@/lib/api/types';

export interface PaymentMethodsWidgetProps {
  filters: PaymentMethodsDashboardQuery;
}

/** Répartition des encaissements par mode de paiement : mesure la bancarisation progressive. */
export function PaymentMethodsWidget({ filters }: PaymentMethodsWidgetProps) {
  const { data, isLoading } = usePaymentMethodsDashboard(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Encaissements par mode de paiement</CardTitle>
        <ExportButton kind="dashboard" filters={{ widget: 'payment-methods', ...filters }} />
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data ? (
          <>
            <p className="text-lg font-semibold">
              Total : <MoneyXaf amount={data.totalAmount} />
            </p>
            {data.byMethod.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Nombre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byMethod.map((row) => (
                    <TableRow key={row.method}>
                      <TableCell>{PAYMENT_METHOD_LABELS[row.method]}</TableCell>
                      <TableCell>
                        <MoneyXaf amount={row.amount} />
                      </TableCell>
                      <TableCell>{Math.round(row.shareBps / 100)} %</TableCell>
                      <TableCell>{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun encaissement sur cette période.</p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
