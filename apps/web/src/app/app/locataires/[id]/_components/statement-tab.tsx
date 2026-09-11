'use client';

import * as React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { StatementTable } from '@/components/business/statement-table';
import { PeriodPicker, currentPeriod } from '@/components/business/period-picker';
import { useTenantStatement } from '@/lib/api/hooks/use-tenant-statement';

export interface StatementTabProps {
  tenantId: string;
}

/** Onglet « Relevé de compte » de la fiche locataire, filtré par mois. */
export function StatementTab({ tenantId }: StatementTabProps) {
  const [period, setPeriod] = React.useState(currentPeriod());
  const from = `${period}-01`;
  const to = `${period}-31`;
  const { data, isLoading } = useTenantStatement(tenantId, { from, to });

  return (
    <div className="space-y-4">
      <PeriodPicker value={period} onValueChange={setPeriod} />
      {isLoading || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <StatementTable statement={data} />
      )}
    </div>
  );
}
