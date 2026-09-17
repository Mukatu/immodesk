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
import { useVacancyDashboard } from '@/lib/api/hooks/use-dashboards';
import type { VacancyDashboardQuery } from '@/lib/api/types';

export interface VacancyWidgetProps {
  filters: VacancyDashboardQuery;
}

/** Vacance locative : lots, occupés, vacants, taux en points de base, durée moyenne de vacance. */
export function VacancyWidget({ filters }: VacancyWidgetProps) {
  const { data, isLoading } = useVacancyDashboard(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Vacance locative</CardTitle>
        <ExportButton kind="dashboard" filters={{ widget: 'vacancy', ...filters }} />
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data ? (
          <>
            <div className="grid grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Lots</p>
                <p className="text-lg font-semibold">{data.unitsCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Occupés</p>
                <p className="text-lg font-semibold">{data.occupiedCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vacants</p>
                <p className="text-lg font-semibold">{data.vacantCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taux</p>
                <p className="text-lg font-semibold">{Math.round(data.vacancyRateBps / 100)} %</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Durée moyenne de vacance : {data.averageVacancyDays} jour
              {data.averageVacancyDays > 1 ? 's' : ''}
            </p>
            {data.byProperty.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Immeuble</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead>Vacants</TableHead>
                    <TableHead>Taux</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProperty.map((row) => (
                    <TableRow key={row.propertyId}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.unitsCount}</TableCell>
                      <TableCell>{row.vacantCount}</TableCell>
                      <TableCell>{Math.round(row.vacancyRateBps / 100)} %</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
