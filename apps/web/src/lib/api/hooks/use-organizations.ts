import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CreateOrganizationBody,
  Organization,
  OrganizationSettings,
  UpdateOrganizationBody,
} from '@/lib/api/types';
import { meQueryKey } from '@/lib/api/hooks/use-me';

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrganizationBody) =>
      apiFetch<Organization>('/organizations', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useOrganization(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: () => apiFetch<Organization>(`/organizations/${organizationId}`),
    enabled: Boolean(organizationId),
  });
}

export function useOrganizationSettings(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'settings'],
    queryFn: () => apiFetch<OrganizationSettings>(`/organizations/${organizationId}/settings`),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateOrganization(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOrganizationBody) =>
      apiFetch<Organization>(`/organizations/${organizationId}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId] });
      queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useUpdateOrganizationSettings(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OrganizationSettings>) =>
      apiFetch<OrganizationSettings>(`/organizations/${organizationId}/settings`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'settings'] });
    },
  });
}
