import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchText } from '@/lib/api/client';

export type ContractJobStatusValue = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export interface ContractJobResponse {
  jobId: string;
  status: ContractJobStatusValue;
  leaseDocumentId?: string;
  error?: string;
}

export function useGenerateContract(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { regenerate?: boolean } = {}) =>
      apiFetch<{ jobId: string; status: 'QUEUED' }>(`/leases/${leaseId}/contract`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId, 'contract-preview'] });
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId] });
    },
  });
}

export function useContractJob(leaseId: string, jobId: string | null) {
  return useQuery({
    queryKey: ['leases', leaseId, 'contract', 'jobs', jobId],
    queryFn: () => apiFetch<ContractJobResponse>(`/leases/${leaseId}/contract/jobs/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'DONE' || status === 'FAILED' ? false : 2000;
    },
  });
}

/** Récupère l'aperçu HTML du gabarit de contrat rendu avec les données du bail. */
export function fetchContractPreviewHtml(leaseId: string): Promise<string> {
  return apiFetchText(`/leases/${leaseId}/contract/preview`);
}

export function useContractPreviewHtml(leaseId: string | null) {
  return useQuery({
    queryKey: ['leases', leaseId, 'contract-preview'],
    queryFn: () => fetchContractPreviewHtml(leaseId as string),
    enabled: Boolean(leaseId),
  });
}
