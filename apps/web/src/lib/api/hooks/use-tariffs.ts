import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { MeterType, UtilityTariff, UtilityTariffInput } from '@/lib/api/types';

export interface UseUtilityTariffsParams {
  propertyId?: string;
  meterType?: MeterType;
  activeOnly?: boolean;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useUtilityTariffs(params: UseUtilityTariffsParams = {}) {
  return useQuery({
    queryKey: ['utility-tariffs', params],
    queryFn: () =>
      apiFetch<{ items: UtilityTariff[] }>(
        `/utility-tariffs${buildQuery({
          propertyId: params.propertyId,
          meterType: params.meterType,
          activeOnly: params.activeOnly,
        })}`,
      ),
  });
}

export function useCreateUtilityTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UtilityTariffInput) =>
      apiFetch<UtilityTariff>('/utility-tariffs', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-tariffs'] });
    },
  });
}

export function useUpdateUtilityTariff(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<UtilityTariffInput>) =>
      apiFetch<UtilityTariff>(`/utility-tariffs/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utility-tariffs'] });
    },
  });
}
