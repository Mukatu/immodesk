'use client';

import * as React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { isExportJobAccepted, useExport, useExportJob } from '@/lib/api/hooks/use-exports';
import { ApiError, genericErrorMessage } from '@/lib/api/errors';
import type { ExportKind, ExportRequestBody } from '@/lib/api/types';

export interface ExportButtonProps {
  kind: ExportKind;
  filters?: ExportRequestBody['filters'];
  label?: string;
}

/**
 * Bouton d'export CSV (arbitrage 5 du contrat phase 9 : jamais Excel, il est
 * écarté). Gère les deux réponses possibles : `201` synchrone (lien direct)
 * ou `202 { jobId }` suivi par interrogation périodique jusqu'à `DONE`/`FAILED`.
 */
export function ExportButton({ kind, filters, label = 'Exporter (CSV)' }: ExportButtonProps) {
  const exportMutation = useExport(kind);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const jobQuery = useExportJob(jobId);

  React.useEffect(() => {
    if (!jobQuery.data) return;
    if (jobQuery.data.status === 'DONE' && jobQuery.data.downloadUrl) {
      toast.success('Export prêt.', { description: jobQuery.data.downloadUrl });
      setJobId(null);
    } else if (jobQuery.data.status === 'FAILED') {
      toast.error(jobQuery.data.error ?? genericErrorMessage);
      setJobId(null);
    }
  }, [jobQuery.data]);

  async function handleExport() {
    try {
      const response = await exportMutation.mutateAsync({ filters });
      if (isExportJobAccepted(response)) {
        setJobId(response.jobId);
        toast.info('Export en cours de préparation…');
      } else {
        const plural = response.rowCount > 1 ? 's' : '';
        toast.success(`Export prêt (${response.rowCount} ligne${plural}).`, {
          description: response.downloadUrl,
        });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : genericErrorMessage);
    }
  }

  const isPending = exportMutation.isPending || Boolean(jobId);

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="mr-2 size-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
