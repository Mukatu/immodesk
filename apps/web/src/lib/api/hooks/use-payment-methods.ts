import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { PaymentMethodsSettings, PaymentMethodsSettingsResponse } from '@/lib/api/types';

export function usePaymentMethods(organizationId: string | null) {
  return useQuery({
    queryKey: ['payment-methods', organizationId],
    queryFn: () =>
      apiFetch<PaymentMethodsSettingsResponse>(`/organizations/${organizationId}/payment-methods`),
    enabled: Boolean(organizationId),
  });
}

export function useUpdatePaymentMethods(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PaymentMethodsSettings>) =>
      apiFetch<PaymentMethodsSettingsResponse>(`/organizations/${organizationId}/payment-methods`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods', organizationId] });
    },
  });
}
