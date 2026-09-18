import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  PortfolioImportAccepted,
  PortfolioImportInput,
  PortfolioImportReport,
} from '@/lib/api/types';

/**
 * Import de portefeuille depuis un fichier déjà téléversé (module documents).
 * Répond 409 `IMPORTS.ALREADY_RUNNING` si un import est déjà en cours.
 */
export function useStartPortfolioImport() {
  return useMutation({
    mutationFn: (body: PortfolioImportInput) =>
      apiFetch<PortfolioImportAccepted>('/portfolio-imports', { method: 'POST', body }),
  });
}

/** Suivi d'un import en travail de fond, interrogé jusqu'à DONE ou FAILED. */
export function usePortfolioImportJob(jobId: string | null) {
  return useQuery({
    queryKey: ['portfolio-imports', jobId],
    queryFn: () => apiFetch<PortfolioImportReport>(`/portfolio-imports/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DONE' || status === 'FAILED' ? false : 1500;
    },
  });
}
