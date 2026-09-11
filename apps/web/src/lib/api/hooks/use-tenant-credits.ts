import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { InvoiceDetail, TenantCredit, TenantCredits } from '@/lib/api/types';

export function useTenantCredits(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'credits'],
    queryFn: () => apiFetch<TenantCredits>(`/tenants/${tenantId}/credits`),
    enabled: Boolean(tenantId),
  });
}

export function useApplyTenantCredit(tenantId: string, creditId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { invoiceId: string; amount?: number }) =>
      apiFetch<{ credit: TenantCredit; invoice: InvoiceDetail }>(
        `/tenants/${tenantId}/credits/${creditId}/apply`,
        { method: 'POST', body },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId, 'credits'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
