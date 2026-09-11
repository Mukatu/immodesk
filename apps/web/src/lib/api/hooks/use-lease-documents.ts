import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { LeaseDocument, LeaseDocumentKind } from '@/lib/api/types';

export interface CreateLeaseDocumentBody {
  documentId: string;
  kind: LeaseDocumentKind;
  title: string;
  effectiveDate?: string;
  isSigned?: boolean;
  signedAt?: string;
}

export function useLeaseDocuments(leaseId: string | null) {
  return useQuery({
    queryKey: ['leases', leaseId, 'documents'],
    queryFn: () => apiFetch<{ items: LeaseDocument[] }>(`/leases/${leaseId}/documents`),
    enabled: Boolean(leaseId),
  });
}

export function useCreateLeaseDocument(leaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLeaseDocumentBody) =>
      apiFetch<LeaseDocument>(`/leases/${leaseId}/documents`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId] });
      queryClient.invalidateQueries({ queryKey: ['leases', leaseId, 'documents'] });
    },
  });
}
