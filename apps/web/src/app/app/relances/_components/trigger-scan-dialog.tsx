'use client';

import * as React from 'react';
import { PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTriggerDunningRuns } from '@/lib/api/hooks/use-dunning-runs';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { TriggerDunningRunsResult } from '@/lib/api/types';
import { DunningTriggerReport } from './dunning-trigger-report';

export interface TriggerScanDialogProps {
  organizationId: string | null;
}

/**
 * Déclenchement du scan de relance à la demande (`POST
 * /organizations/{id}/dunning-runs/trigger`), avec option de simulation
 * (`dryRun`) qui n'envoie rien. Le compte-rendu (examinées/créées/ignorées/
 * en échec) est affiché immédiatement : ce n'est pas un job asynchrone suivi
 * par interrogation, contrairement à la campagne de refacturation.
 */
export function TriggerScanDialog({ organizationId }: TriggerScanDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [dryRun, setDryRun] = React.useState(true);
  const [result, setResult] = React.useState<TriggerDunningRunsResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const trigger = useTriggerDunningRuns(organizationId);

  async function handleTrigger() {
    setError(null);
    try {
      const report = await trigger.mutateAsync({ dryRun });
      setResult(report);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setResult(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <PlayCircle className="mr-2 size-4" aria-hidden="true" />
          Lancer le scan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan des relances</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Simulation (n&apos;envoie rien)
          </label>
          {error ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          {result ? <DunningTriggerReport {...result} /> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleTrigger}
            disabled={trigger.isPending || !organizationId}
          >
            {trigger.isPending ? 'Scan en cours…' : 'Lancer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
