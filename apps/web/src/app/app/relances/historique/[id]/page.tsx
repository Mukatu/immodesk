'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/business/empty-state';
import { PageHeader } from '@/components/business/page-header';
import { useDunningRun } from '@/lib/api/hooks/use-dunning-runs';
import { formatDateTimeFr } from '../../_components/format-date-fr';
import { DunningRunDetailSummary } from '../_components/dunning-run-detail-summary';

export default function DunningRunDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: run, isLoading } = useDunningRun(params.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!run) {
    return <EmptyState title="Exécution introuvable" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${run.ruleName} — rang ${run.stepOrder}`}
        description={`Exécutée le ${formatDateTimeFr(run.scheduledAt)}${run.executedAt ? ` (traitée le ${formatDateTimeFr(run.executedAt)})` : ''}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail</CardTitle>
        </CardHeader>
        <CardContent>
          <DunningRunDetailSummary run={run} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Locataire et facture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Locataire : <span className="font-medium">{run.tenant.displayName}</span>
          </p>
          {run.invoice ? (
            <p>
              Facture :{' '}
              <Link
                href={`/app/factures/${run.invoice.id}`}
                className="font-medium text-primary hover:underline"
              >
                {run.invoice.invoiceNumber ?? run.invoice.id}
              </Link>
            </p>
          ) : (
            <p className="text-muted-foreground">Aucune facture rattachée.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
