import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { ExportJob, ExportKind, ExportRequestBody, ExportResponse } from '@/lib/api/types';

/**
 * Export CSV (arbitrage 5 du contrat phase 9 : jamais Excel). Deux réponses
 * possibles : `201` synchrone avec le lien de téléchargement, ou `202` avec
 * un `jobId` à suivre via `useExportJob`.
 */
export function useExport(kind: ExportKind) {
  return useMutation({
    mutationFn: (body: ExportRequestBody = {}) =>
      apiFetch<ExportResponse>(`/exports/${kind}`, { method: 'POST', body }),
  });
}

export function isExportJobAccepted(response: ExportResponse): response is { jobId: string } {
  return 'jobId' in response;
}

/** Suivi d'un export en travail de fond, interrogé jusqu'à DONE ou FAILED. */
export function useExportJob(jobId: string | null) {
  return useQuery({
    queryKey: ['export-jobs', jobId],
    queryFn: () => apiFetch<ExportJob>(`/exports/jobs/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DONE' || status === 'FAILED' ? false : 1500;
    },
  });
}
