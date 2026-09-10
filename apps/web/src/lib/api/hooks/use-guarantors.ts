import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { Guarantor, GuarantorInput } from '@/lib/api/types';

export function useCreateGuarantor(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GuarantorInput) =>
      apiFetch<Guarantor>(`/tenants/${tenantId}/guarantors`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] });
    },
  });
}

export function useUpdateGuarantor(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<GuarantorInput> }) =>
      apiFetch<Guarantor>(`/guarantors/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] });
    },
  });
}

export function useDeleteGuarantor(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/guarantors/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] });
    },
  });
}
