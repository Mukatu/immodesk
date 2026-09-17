import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { DunningRule, DunningRuleInput } from '@/lib/api/types';

/** Paliers de relance de l'organisation, triés par rang côté serveur. */
export function useDunningRules() {
  return useQuery({
    queryKey: ['dunning-rules'],
    queryFn: () => apiFetch<{ items: DunningRule[] }>('/dunning-rules'),
  });
}

export function useCreateDunningRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DunningRuleInput) =>
      apiFetch<DunningRule>('/dunning-rules', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dunning-rules'] });
    },
  });
}

export function useUpdateDunningRule(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<DunningRuleInput>) =>
      apiFetch<DunningRule>(`/dunning-rules/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dunning-rules'] });
    },
  });
}

/** Un palier ne se supprime jamais : il se désactive (`isActive: false`). */
export function useActivateDunningRule(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      apiFetch<DunningRule>(`/dunning-rules/${id}/activate`, {
        method: 'POST',
        body: { isActive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dunning-rules'] });
    },
  });
}
