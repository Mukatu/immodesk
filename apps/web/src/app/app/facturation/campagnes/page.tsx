'use client';

import * as React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/business/page-header';
import { useBillingRun, useStartBillingRun } from '@/lib/api/hooks/use-billing-runs';

export default function CampagnesFacturationPage() {
  const [period, setPeriod] = React.useState('');
  const [dryRun, setDryRun] = React.useState(false);
  const [runId, setRunId] = React.useState<string | null>(null);

  const startRun = useStartBillingRun();
  const runQuery = useBillingRun(runId);

  async function handleStart() {
    const result = await startRun.mutateAsync({
      periodStart: period || undefined,
      dryRun,
    });
    setRunId(result.runId);
  }

  const run = runQuery.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campagnes de facturation"
        description="Lancez la génération des factures de loyer pour une période."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lancer une campagne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="run-period">Période (optionnel, sinon période courante)</Label>
              <Input
                id="run-period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <Checkbox checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Simulation (dryRun) — aucune facture créée
            </label>
          </div>
          <Button
            type="button"
            onClick={handleStart}
            disabled={startRun.isPending || run?.status === 'RUNNING'}
          >
            {run?.status === 'RUNNING' ? 'Campagne en cours…' : 'Lancer une campagne'}
          </Button>
        </CardContent>
      </Card>

      {run ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {run.status === 'DONE' ? (
                <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
              ) : run.status === 'FAILED' ? (
                <XCircle className="size-5 text-destructive" aria-hidden="true" />
              ) : null}
              Rapport de campagne —{' '}
              {run.status === 'RUNNING'
                ? 'en cours'
                : run.status === 'DONE'
                  ? 'terminée'
                  : 'échouée'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Factures créées</p>
                <p className="text-2xl font-semibold">{run.created}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Baux ignorés</p>
                <p className="text-2xl font-semibold">{run.skipped}</p>
              </div>
            </div>

            {run.errors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Erreurs ({run.errors.length})</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bail</TableHead>
                      <TableHead>Motif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {run.errors.map((err, index) => (
                      <TableRow key={`${err.leaseId}-${index}`}>
                        <TableCell>{err.leaseId}</TableCell>
                        <TableCell>{err.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune erreur.</p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
