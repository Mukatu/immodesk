import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  Property,
  PropertyDetail,
  PropertyInput,
  PropertySummary,
} from '@/lib/api/types';

export interface UsePropertiesParams {
  q?: string;
  landlordId?: string;
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

export function useProperties(params: UsePropertiesParams = {}) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: () =>
      apiFetch<Paginated<PropertySummary>>(
        `/properties${buildQuery({
          q: params.q,
          landlordId: params.landlordId,
          city: params.city,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useProperty(id: string | null) {
  return useQuery({
    queryKey: ['properties', id],
    queryFn: () => apiFetch<PropertyDetail>(`/properties/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PropertyInput) =>
      apiFetch<Property>('/properties', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PropertyInput>) =>
      apiFetch<Property>(`/properties/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', id] });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/properties/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', id] });
    },
  });
}
