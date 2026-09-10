import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { Member, Role } from '@/lib/api/types';

export function useMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'members'],
    queryFn: () => apiFetch<{ items: Member[] }>(`/organizations/${organizationId}/members`),
    enabled: Boolean(organizationId),
    staleTime: 60 * 1000,
  });
}

export function useUpdateMemberRole(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      apiFetch<Member>(`/organizations/${organizationId}/members/${memberId}`, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'members'] });
    },
  });
}

export function useRemoveMember(organizationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiFetch<void>(`/organizations/${organizationId}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'members'] });
    },
  });
}
