import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { PenaltyRule, PenaltyRuleInput } from '@/lib/api/types';

export function usePenaltyRules() {
  return useQuery({
    queryKey: ['penalty-rules'],
    queryFn: () => apiFetch<{ items: PenaltyRule[] }>('/penalty-rules'),
  });
}

export function useCreatePenaltyRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PenaltyRuleInput) =>
      apiFetch<PenaltyRule>('/penalty-rules', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalty-rules'] });
    },
  });
}

export function useUpdatePenaltyRule(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PenaltyRuleInput>) =>
      apiFetch<PenaltyRule>(`/penalty-rules/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalty-rules'] });
    },
  });
}
