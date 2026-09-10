import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { Landlord, LandlordDetail, LandlordInput, Paginated } from '@/lib/api/types';

export interface UseLandlordsParams {
  q?: string;
  city?: string;
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

export function useLandlords(params: UseLandlordsParams = {}) {
  return useQuery({
    queryKey: ['landlords', params],
    queryFn: () =>
      apiFetch<Paginated<Landlord>>(
        `/landlords${buildQuery({ q: params.q, city: params.city, cursor: params.cursor, limit: params.limit })}`,
      ),
  });
}

export function useLandlord(id: string | null) {
  return useQuery({
    queryKey: ['landlords', id],
    queryFn: () => apiFetch<LandlordDetail>(`/landlords/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateLandlord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LandlordInput) => apiFetch<Landlord>('/landlords', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
    },
  });
}

export function useUpdateLandlord(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<LandlordInput>) =>
      apiFetch<Landlord>(`/landlords/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      queryClient.invalidateQueries({ queryKey: ['landlords', id] });
    },
  });
}

export function useDeleteLandlord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/landlords/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      queryClient.invalidateQueries({ queryKey: ['landlords', id] });
    },
  });
}
