import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Lease,
  LeaseDetail,
  LeaseInput,
  LeaseStatus,
  LeaseSummary,
  Paginated,
} from '@/lib/api/types';

export interface UseLeasesParams {
  status?: LeaseStatus;
  propertyId?: string;
  tenantId?: string;
  unitId?: string;
  endingWithinDays?: number;
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

export function useLeases(params: UseLeasesParams = {}) {
  return useQuery({
    queryKey: ['leases', params],
    queryFn: () =>
      apiFetch<Paginated<LeaseSummary>>(
        `/leases${buildQuery({
          status: params.status,
          propertyId: params.propertyId,
          tenantId: params.tenantId,
          unitId: params.unitId,
          endingWithinDays: params.endingWithinDays,
          q: params.q,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useLease(id: string | null) {
  return useQuery({
    queryKey: ['leases', id],
    queryFn: () => apiFetch<LeaseDetail>(`/leases/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LeaseInput) => apiFetch<Lease>('/leases', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
  });
}

export function useUpdateLease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<LeaseInput>) =>
      apiFetch<Lease>(`/leases/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', id] });
    },
  });
}

export function useDeleteLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/leases/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', id] });
    },
  });
}

export function useActivateLease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { moveInDate?: string } = {}) =>
      apiFetch<LeaseDetail>(`/leases/${id}/activate`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', id] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });
}

export function useCancelLease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { reason: string }) =>
      apiFetch<Lease>(`/leases/${id}/cancel`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', id] });
    },
  });
}

export function useNoticeLease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { effectiveDate: string; reason: string }) =>
      apiFetch<Lease>(`/leases/${id}/notice`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', id] });
    },
  });
}

export function useTerminateLease(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { effectiveDate: string; reason: string }) =>
      apiFetch<LeaseDetail>(`/leases/${id}/terminate`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['leases', id] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
    },
  });
}
