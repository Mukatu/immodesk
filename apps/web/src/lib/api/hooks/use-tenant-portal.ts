import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { tenantApiFetch } from '@/lib/api/tenant-client';
import type {
  Document,
  Paginated,
  PaymentInstructions,
  TenantBankTransferDeclaration,
  TenantBankTransferDeclarationInput,
  TenantCreateDocumentBody,
  TenantInvoice,
  TenantInvoicePaymentAccepted,
  TenantInvoicePaymentInput,
  TenantReceiptDownload,
  TenantUploadUrlRequest,
  UploadUrlResponse,
} from '@/lib/api/types';

export interface UseTenantPaginationParams {
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

/** GET /tenant/invoices — factures des baux actifs du locataire connecté. */
export function useTenantInvoices(params: UseTenantPaginationParams = {}) {
  return useQuery({
    queryKey: ['tenant-invoices', params],
    queryFn: () =>
      tenantApiFetch<Paginated<TenantInvoice>>(
        `/tenant/invoices${buildQuery({ limit: params.limit, cursor: params.cursor })}`,
      ),
  });
}

/** GET /tenant/invoices/{id} — 404 hors périmètre, propagé tel quel. */
export function useTenantInvoice(id: string | null) {
  return useQuery({
    queryKey: ['tenant-invoices', id],
    queryFn: () => tenantApiFetch<TenantInvoice>(`/tenant/invoices/${id}`),
    enabled: Boolean(id),
  });
}

/** POST /tenant/invoices/{id}/pay — Mobile Money, invalide la facture et la liste. */
export function usePayTenantInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantInvoicePaymentInput) =>
      tenantApiFetch<TenantInvoicePaymentAccepted>(`/tenant/invoices/${id}/pay`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
    },
  });
}

/** GET /tenant/receipts/{id} — lien de téléchargement à durée de vie limitée. */
export function useTenantReceipt(id: string | null) {
  return useQuery({
    queryKey: ['tenant-receipts', id],
    queryFn: () => tenantApiFetch<TenantReceiptDownload>(`/tenant/receipts/${id}`),
    enabled: Boolean(id),
  });
}

/**
 * GET /tenant/leases/{id}/payment-instructions — comptes de destination d'un
 * virement pour le bail du locataire connecté (résolution sans passer par
 * `orgIdFromRequest`, indisponible pour ce jeton — voir tenant-portal-handlers.ts).
 */
export function useTenantLeasePaymentInstructions(leaseId: string | null) {
  return useQuery({
    queryKey: ['tenant-lease-payment-instructions', leaseId],
    queryFn: () =>
      tenantApiFetch<PaymentInstructions>(`/tenant/leases/${leaseId}/payment-instructions`),
    enabled: Boolean(leaseId),
  });
}

/**
 * POST /tenant/documents/upload-url — extension mock au contrat (voir
 * apps/web/src/mocks/tenant-portal-handlers.ts) : les routes génériques
 * `/documents/*` exigent `X-Organization-Id`, indisponible pour un jeton
 * locataire. Réservé pour l'instant à la preuve de virement (`upload-tenant-proof.ts`).
 */
export function useRequestTenantUploadUrl() {
  return useMutation({
    mutationFn: (body: TenantUploadUrlRequest) =>
      tenantApiFetch<UploadUrlResponse>('/tenant/documents/upload-url', {
        method: 'POST',
        body,
      }),
  });
}

/** POST /tenant/documents — même extension, second temps de l'envoi (voir ci-dessus). */
export function useCreateTenantDocument() {
  return useMutation({
    mutationFn: (body: TenantCreateDocumentBody) =>
      tenantApiFetch<Document>('/tenant/documents', { method: 'POST', body }),
  });
}

/** GET /tenant/bank-transfer-declarations — déclarations du locataire connecté. */
export function useTenantBankTransferDeclarations(params: UseTenantPaginationParams = {}) {
  return useQuery({
    queryKey: ['tenant-bank-transfer-declarations', params],
    queryFn: () =>
      tenantApiFetch<Paginated<TenantBankTransferDeclaration>>(
        `/tenant/bank-transfer-declarations${buildQuery({
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

/** POST /tenant/bank-transfer-declarations — invalide la liste des déclarations. */
export function useCreateTenantBankTransferDeclaration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantBankTransferDeclarationInput) =>
      tenantApiFetch<TenantBankTransferDeclaration>('/tenant/bank-transfer-declarations', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-bank-transfer-declarations'] });
    },
  });
}
