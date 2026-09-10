import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  BulkUnitsInput,
  Paginated,
  Unit,
  UnitDetail,
  UnitInput,
  UnitStatus,
} from '@/lib/api/types';

export interface UseUnitsParams {
  propertyId?: string;
  status?: UnitStatus;
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

export function useUnits(params: UseUnitsParams = {}) {
  return useQuery({
    queryKey: ['units', params],
    queryFn: () =>
      apiFetch<Paginated<Unit>>(
        `/units${buildQuery({
          propertyId: params.propertyId,
          status: params.status,
          q: params.q,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useUnit(id: string | null) {
  return useQuery({
    queryKey: ['units', id],
    queryFn: () => apiFetch<UnitDetail>(`/units/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateUnit(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UnitInput) =>
      apiFetch<Unit>(`/properties/${propertyId}/units`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
    },
  });
}

export function useBulkCreateUnits(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkUnitsInput) =>
      apiFetch<{ created: Unit[] }>(`/properties/${propertyId}/units/bulk`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useUpdateUnit(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UnitInput>) =>
      apiFetch<Unit>(`/units/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', id] });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/units/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', id] });
    },
  });
}
