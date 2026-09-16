import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  ConfirmMeterReadingBody,
  Meter,
  MeterInput,
  MeterReading,
  MeterReadingInput,
  MeterReadingsResponse,
  MeterType,
  Paginated,
} from '@/lib/api/types';

export interface UseMetersParams {
  propertyId?: string;
  unitId?: string;
  type?: MeterType;
  cursor?: string;
  limit?: number;
}

export interface UseMeterReadingsParams {
  from?: string;
  to?: string;
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

export function useMeters(params: UseMetersParams = {}) {
  return useQuery({
    queryKey: ['meters', params],
    queryFn: () =>
      apiFetch<Paginated<Meter>>(
        `/meters${buildQuery({
          propertyId: params.propertyId,
          unitId: params.unitId,
          type: params.type,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useCreateMeter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeterInput) => apiFetch<Meter>('/meters', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}

export function useUpdateMeter(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MeterInput>) =>
      apiFetch<Meter>(`/meters/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}

// ---- Relevés ----

export function useMeterReadings(meterId: string | null, params: UseMeterReadingsParams = {}) {
  return useQuery({
    queryKey: ['meters', meterId, 'readings', params],
    queryFn: () =>
      apiFetch<MeterReadingsResponse>(
        `/meters/${meterId}/readings${buildQuery({
          from: params.from,
          to: params.to,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
    enabled: Boolean(meterId),
  });
}

export function useCreateMeterReading(meterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MeterReadingInput) =>
      apiFetch<MeterReading>(`/meters/${meterId}/readings`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
      queryClient.invalidateQueries({ queryKey: ['meters', meterId, 'readings'] });
    },
  });
}

/**
 * Confirmation d'un relevé estimé (`isEstimated: true`) avant qu'il puisse
 * être pris en compte par une campagne de refacturation.
 */
export function useConfirmMeterReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ConfirmMeterReadingBody }) =>
      apiFetch<MeterReading>(`/meter-readings/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}
