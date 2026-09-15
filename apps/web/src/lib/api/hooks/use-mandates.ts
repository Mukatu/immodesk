import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  AddMandatePropertiesBody,
  LandlordInvitationResponse,
  Mandate,
  MandateDetail,
  MandateInput,
  MandateStatus,
  MandateSummary,
  Paginated,
  SuspendMandateBody,
  TerminateMandateBody,
} from '@/lib/api/types';

export interface UseMandatesParams {
  status?: MandateStatus;
  landlordId?: string;
  propertyId?: string;
  limit?: number;
  cursor?: string;
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

export function useMandates(params: UseMandatesParams = {}) {
  return useQuery({
    queryKey: ['mandates', params],
    queryFn: () =>
      apiFetch<Paginated<MandateSummary>>(
        `/management-mandates${buildQuery({
          status: params.status,
          landlordId: params.landlordId,
          propertyId: params.propertyId,
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export function useMandate(id: string | null) {
  return useQuery({
    queryKey: ['mandates', id],
    queryFn: () => apiFetch<MandateDetail>(`/management-mandates/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateMandate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MandateInput) =>
      apiFetch<Mandate>('/management-mandates', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
    },
  });
}

export function useUpdateMandate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MandateInput>) =>
      apiFetch<Mandate>(`/management-mandates/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      queryClient.invalidateQueries({ queryKey: ['mandates', id] });
    },
  });
}

export function useActivateMandate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<Mandate>(`/management-mandates/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      queryClient.invalidateQueries({ queryKey: ['mandates', id] });
    },
  });
}

export function useSuspendMandate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SuspendMandateBody) =>
      apiFetch<Mandate>(`/management-mandates/${id}/suspend`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      queryClient.invalidateQueries({ queryKey: ['mandates', id] });
    },
  });
}

export function useTerminateMandate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TerminateMandateBody) =>
      apiFetch<Mandate>(`/management-mandates/${id}/terminate`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      queryClient.invalidateQueries({ queryKey: ['mandates', id] });
    },
  });
}

export function useAddMandateProperties(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMandatePropertiesBody) =>
      apiFetch<MandateDetail>(`/management-mandates/${id}/properties`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      queryClient.invalidateQueries({ queryKey: ['mandates', id] });
    },
  });
}

export function useInviteMandateLandlord(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<LandlordInvitationResponse>(`/management-mandates/${id}/landlord-invitation`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates', id] });
    },
  });
}
