import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { CreateInvitationBody, Invitation, InvitationPreview, OrganizationMembership } from '@/lib/api/types';

export function useInvitations(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'invitations'],
    queryFn: () =>
      apiFetch<{ items: Invitation[] }>(`/organizations/${organizationId}/invitations`),
    enabled: Boolean(organizationId),
    staleTime: 30 * 1000,
  });
}

export function useCreateInvitation(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationBody) =>
      apiFetch<Invitation>(`/organizations/${organizationId}/invitations`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'invitations'] });
    },
  });
}

export function useRevokeInvitation(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch<void>(`/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'invitations'] });
    },
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: ['invitations', token],
    queryFn: () => apiFetch<InvitationPreview>(`/invitations/${token}`, { skipAuth: true }),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<OrganizationMembership>(`/invitations/${token}/accept`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
