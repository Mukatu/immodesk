import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { RentRevision } from '@/lib/api/types';

export interface CreateRentRevisionBody {
  effectiveDate: string;
  newRentAmount: number;
  newChargesAmount?: number;
  reason?: string;
  documentId?: string;
}

export interface RentAtResponse {
  date: string;
  rentAmount: number;
  chargesAmount: number;
  source: 'INITIAL' | 'REVISION';
  revisionId?: string;
}

export function useRentRevisions(leaseId: string | null) {
  return useQuery({
    queryKey: ['leases', leaseId, 'rent-revisions'],
    queryFn: () => apiFetch<{ items: RentRevision[] }>(`/leases/${leaseId}/rent-revisions`),
    enabled: Boolean(leaseId),
  });
}

export function useCreateRentRevision(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRentRevisionBody) =>
      apiFetch<RentRevision>(`/leases/${leaseId}/rent-revisions`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId, 'rent-revisions'] });
    },
  });
}

export function useRentAt(leaseId: string, date: string | null) {
  return useQuery({
    queryKey: ['leases', leaseId, 'rent-at', date],
    queryFn: () => apiFetch<RentAtResponse>(`/leases/${leaseId}/rent-at?date=${date}`),
    enabled: Boolean(date),
  });
}
