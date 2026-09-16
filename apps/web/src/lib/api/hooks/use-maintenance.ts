import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  AssignMaintenanceRequestBody,
  MaintenanceDetail,
  MaintenanceInput,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceSummary,
  MaintenanceUpdate,
  MaintenanceUpdateInput,
  Paginated,
  RejectMaintenanceRequestBody,
  ResolveMaintenanceRequestBody,
} from '@/lib/api/types';

export interface UseMaintenanceRequestsParams {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  propertyId?: string;
  assignedToUserId?: string;
  overdueOnly?: boolean;
  cursor?: string;
  limit?: number;
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

export function useMaintenanceRequests(params: UseMaintenanceRequestsParams = {}) {
  return useQuery({
    queryKey: ['maintenance-requests', params],
    queryFn: () =>
      apiFetch<Paginated<MaintenanceSummary>>(
        `/maintenance-requests${buildQuery({
          status: params.status,
          priority: params.priority,
          propertyId: params.propertyId,
          assignedToUserId: params.assignedToUserId,
          overdueOnly: params.overdueOnly,
          cursor: params.cursor,
          limit: params.limit,
        })}`,
      ),
  });
}

export function useMaintenanceRequest(id: string | null) {
  return useQuery({
    queryKey: ['maintenance-requests', id],
    queryFn: () => apiFetch<MaintenanceDetail>(`/maintenance-requests/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MaintenanceInput) =>
      apiFetch<MaintenanceDetail>('/maintenance-requests', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    },
  });
}

function invalidateOne(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance-requests', id] });
}

export function useAcknowledgeMaintenanceRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<MaintenanceDetail>(`/maintenance-requests/${id}/acknowledge`, { method: 'POST' }),
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useAssignMaintenanceRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignMaintenanceRequestBody) =>
      apiFetch<MaintenanceDetail>(`/maintenance-requests/${id}/assign`, { method: 'POST', body }),
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

/**
 * Ajoute une mise à jour (`maintenance_updates`) : changement de statut
 * (`IN_PROGRESS`, `ON_HOLD`...), message, photo ou dépense rattachée.
 */
export function useAddMaintenanceUpdate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MaintenanceUpdateInput) =>
      apiFetch<MaintenanceUpdate>(`/maintenance-requests/${id}/updates`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useResolveMaintenanceRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ResolveMaintenanceRequestBody) =>
      apiFetch<MaintenanceDetail>(`/maintenance-requests/${id}/resolve`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useCloseMaintenanceRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<MaintenanceDetail>(`/maintenance-requests/${id}/close`, { method: 'POST' }),
    onSuccess: () => invalidateOne(queryClient, id),
  });
}

export function useRejectMaintenanceRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RejectMaintenanceRequestBody) =>
      apiFetch<MaintenanceDetail>(`/maintenance-requests/${id}/reject`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => invalidateOne(queryClient, id),
  });
}
