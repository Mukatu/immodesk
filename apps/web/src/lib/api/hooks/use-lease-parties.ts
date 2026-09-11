import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { LeaseParty, LeasePartyInput } from '@/lib/api/types';

export function useCreateLeaseParty(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LeasePartyInput) =>
      apiFetch<LeaseParty>(`/leases/${leaseId}/parties`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId] });
    },
  });
}

export function useUpdateLeaseParty(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      partyId,
      body,
    }: {
      partyId: string;
      body: { shareBps?: number; isSolidary?: boolean };
    }) => apiFetch<LeaseParty>(`/leases/${leaseId}/parties/${partyId}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId] });
    },
  });
}

export function useDeleteLeaseParty(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partyId: string) =>
      apiFetch<void>(`/leases/${leaseId}/parties/${partyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId] });
    },
  });
}
