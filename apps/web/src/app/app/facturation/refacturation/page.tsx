'use client';

import * as React from 'react';
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/business/page-header';
import { useProperties } from '@/lib/api/hooks/use-properties';
import { useLaunchUtilityRun, useUtilityRun } from '@/lib/api/hooks/use-utility-runs';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import { UtilityRunReport } from './_components/utility-run-report';

export default function RefacturationChargesPage() {
  const [periodStart, setPeriodStart] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [propertyId, setPropertyId] = React.useState('ALL');
  const [runId, setRunId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const { data: propertiesData } = useProperties({ limit: 100 });
  const properties = React.useMemo(() => propertiesData?.items ?? [], [propertiesData]);

  const launchRun = useLaunchUtilityRun();
  const runQuery = useUtilityRun(runId);
  const run = runQuery.data;
  const isRunning = run?.status === 'RUNNING';

  async function handleLaunch() {
    setFormError(null);
    if (!periodStart || !periodEnd) {
      setFormError('Renseignez la période de début et de fin.');
      return;
    }
    if (periodEnd < periodStart) {
      setFormError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }
    try {
      const result = await launchRun.mutateAsync({
        periodStart,
        periodEnd,
        propertyId: propertyId === 'ALL' ? undefined : propertyId,
      });
      setRunId(result.runId);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campagne de refacturation des charges"
        description="Valorise les relevés d'eau et d'électricité non facturés d'une période et ajoute la charge à la facture du bail concerné."
      />

      <div
        role="note"
        className="rounded-md border border-success/40 bg-success/10 p-4 text-sm text-foreground"
      >
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-5 text-success" aria-hidden="true" />
          Aucun risque de double facturation
        </p>
        <p className="mt-1 text-muted-foreground">
          La refacturation est idempotente par construction : un relevé déjà facturé est
          automatiquement ignoré. Relancer cette campagne, y compris sur une période déjà traitée,
          ne crée donc jamais deux fois la même charge.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lancer une campagne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="run-period-start">Période — début</Label>
              <Input
                id="run-period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-period-end">Période — fin</Label>
              <Input
                id="run-period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-property">Bien (optionnel)</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="run-property" aria-label="Restreindre à un bien">
                  <SelectValue placeholder="Tous les biens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les biens</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formError ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
              {formError}
            </p>
          ) : null}

          <Button type="button" onClick={handleLaunch} disabled={launchRun.isPending || isRunning}>
            {isRunning ? 'Campagne en cours…' : 'Lancer la campagne'}
          </Button>
        </CardContent>
      </Card>

      {run ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base" aria-live="polite">
                {run.status === 'RUNNING' ? (
                  <>
                    <Loader2 className="size-5 animate-spin text-warning" aria-hidden="true" />
                    Campagne en cours…
                  </>
                ) : run.status === 'DONE' ? (
                  <>
                    <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                    Campagne terminée
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 text-destructive" aria-hidden="true" />
                    Campagne échouée
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>

          <UtilityRunReport created={run.created} skipped={run.skipped} errors={run.errors} />
        </div>
      ) : null}
    </div>
  );
}
