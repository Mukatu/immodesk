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
import { useCollectionRateDashboard } from '@/lib/api/hooks/use-dashboards';
import type { CollectionRateDashboardQuery } from '@/lib/api/types';

export interface CollectionRateWidgetProps {
  filters: CollectionRateDashboardQuery;
}

/** Taux de recouvrement : montant dû, encaissé, taux en points de base et série mensuelle. */
export function CollectionRateWidget({ filters }: CollectionRateWidgetProps) {
  const { data, isLoading } = useCollectionRateDashboard(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Taux de recouvrement</CardTitle>
        <ExportButton kind="dashboard" filters={{ widget: 'collection-rate', ...filters }} />
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Dû</p>
                <p className="text-lg font-semibold">
                  <MoneyXaf amount={data.dueAmount} />
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Encaissé</p>
                <p className="text-lg font-semibold">
                  <MoneyXaf amount={data.collectedAmount} colorize />
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Taux</p>
                <p className="text-lg font-semibold">
                  {Math.round(data.collectionRateBps / 100)} %
                </p>
              </div>
            </div>
            {data.series.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead>Dû</TableHead>
                    <TableHead>Encaissé</TableHead>
                    <TableHead>Taux</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.series.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell>{row.period}</TableCell>
                      <TableCell>
                        <MoneyXaf amount={row.dueAmount} />
                      </TableCell>
                      <TableCell>
                        <MoneyXaf amount={row.collectedAmount} colorize />
                      </TableCell>
                      <TableCell>{Math.round(row.collectionRateBps / 100)} %</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune donnée pour cette période.</p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
