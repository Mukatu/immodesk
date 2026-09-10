import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  CreateDocumentBody,
  Document,
  DocumentKind,
  RelatedEntityType,
  UploadUrlRequest,
  UploadUrlResponse,
} from '@/lib/api/types';

export interface UseDocumentsParams {
  relatedEntityType?: RelatedEntityType;
  relatedEntityId?: string;
  kind?: DocumentKind;
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

export function useDocuments(params: UseDocumentsParams = {}) {
  return useQuery({
    queryKey: ['documents', params.relatedEntityType, params.relatedEntityId, params.kind],
    queryFn: () =>
      apiFetch<{ items: Document[] }>(
        `/documents${buildQuery({
          relatedEntityType: params.relatedEntityType,
          relatedEntityId: params.relatedEntityId,
          kind: params.kind,
        })}`,
      ),
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: (body: UploadUrlRequest) =>
      apiFetch<UploadUrlResponse>('/documents/upload-url', { method: 'POST', body }),
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDocumentBody) =>
      apiFetch<Document>('/documents', { method: 'POST', body }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['documents', variables.relatedEntityType, variables.relatedEntityId],
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/** Appel impératif (hors hook) pour le clic "Télécharger" sur un document. */
export function fetchDocumentDownloadUrl(
  id: string,
): Promise<{ downloadUrl: string; expiresAt: string }> {
  return apiFetch<{ downloadUrl: string; expiresAt: string }>(`/documents/${id}/download-url`);
}
