import { useMutation, useQuery } from '@tanstack/react-query';

import { portalApiFetch } from '@/lib/api/portal-client';
import type {
  CollectionView,
  OwnerStatementSummary,
  Paginated,
  Payout,
  PortalActivationRequestBody,
  PortalActivationRequestResponse,
  PortalActivationVerifyBody,
  PortalActivationVerifyResponse,
  PortalMeResponse,
  ReceiptSummary,
} from '@/lib/api/types';

export function useRequestPortalActivation() {
  return useMutation({
    mutationFn: (body: PortalActivationRequestBody) =>
      portalApiFetch<PortalActivationRequestResponse>('/portal/activation/request', {
        method: 'POST',
        body,
        skipAuth: true,
      }),
  });
}

export function useVerifyPortalActivation() {
  return useMutation({
    mutationFn: (body: PortalActivationVerifyBody) =>
      portalApiFetch<PortalActivationVerifyResponse>('/portal/activation/verify', {
        method: 'POST',
        body,
        skipAuth: true,
      }),
  });
}

export function usePortalMe(enabled = true) {
  return useQuery({
    queryKey: ['portal-me'],
    queryFn: () => portalApiFetch<PortalMeResponse>('/portal/me'),
    enabled,
  });
}

export function usePortalStatements(params: { limit?: number; cursor?: string } = {}) {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const qs = search.toString();
  return useQuery({
    queryKey: ['portal-statements', params],
    queryFn: () =>
      portalApiFetch<Paginated<OwnerStatementSummary>>(`/portal/statements${qs ? `?${qs}` : ''}`),
  });
}

export function usePortalStatementPdf(id: string) {
  return useMutation({
    mutationFn: () =>
      portalApiFetch<{ downloadUrl: string; expiresAt: string }>(`/portal/statements/${id}/pdf`),
  });
}

export function usePortalPayouts(params: { limit?: number; cursor?: string } = {}) {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const qs = search.toString();
  return useQuery({
    queryKey: ['portal-payouts', params],
    queryFn: () => portalApiFetch<Paginated<Payout>>(`/portal/payouts${qs ? `?${qs}` : ''}`),
  });
}

export function usePortalCollections(
  params: { from?: string; to?: string; limit?: number; cursor?: string } = {},
) {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const qs = search.toString();
  return useQuery({
    queryKey: ['portal-collections', params],
    queryFn: () =>
      portalApiFetch<Paginated<CollectionView>>(`/portal/collections${qs ? `?${qs}` : ''}`),
  });
}

export function usePortalReceipts(params: { limit?: number; cursor?: string } = {}) {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const qs = search.toString();
  return useQuery({
    queryKey: ['portal-receipts', params],
    queryFn: () =>
      portalApiFetch<Paginated<ReceiptSummary>>(`/portal/receipts${qs ? `?${qs}` : ''}`),
  });
}
