import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { Paginated, Tenant, TenantDetail, TenantInput } from '@/lib/api/types';

export interface UseTenantsParams {
  q?: string;
  cursor?: string;
  limit?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useTenants(params: UseTenantsParams = {}) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () =>
      apiFetch<Paginated<Tenant>>(
        `/tenants${buildQuery({ q: params.q, cursor: params.cursor, limit: params.limit })}`,
      ),
  });
}

export function useTenant(id: string | null) {
  return useQuery({
    queryKey: ['tenants', id],
    queryFn: () => apiFetch<TenantDetail>(`/tenants/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * Ne transforme jamais l'erreur 409 PARTIES.PHONE_ALREADY_USED : elle doit remonter
 * telle quelle (ApiError avec code + details.existingTenantId) pour que l'écran
 * appelant propose la confirmation via confirmDuplicatePhone.
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantInput & { confirmDuplicatePhone?: boolean }) =>
      apiFetch<Tenant>('/tenants', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<TenantInput>) =>
      apiFetch<Tenant>(`/tenants/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', id] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/tenants/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', id] });
    },
  });
}
