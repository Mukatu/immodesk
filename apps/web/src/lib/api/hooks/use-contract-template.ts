import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { ContractTemplate } from '@/lib/api/types';

export function useContractTemplate(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'contract-template'],
    queryFn: () => apiFetch<ContractTemplate>(`/organizations/${organizationId}/contract-template`),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateContractTemplate(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ContractTemplate>) =>
      apiFetch<ContractTemplate>(`/organizations/${organizationId}/contract-template`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'contract-template'],
      });
    },
  });
}
