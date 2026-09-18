import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  Subscription,
  SubscriptionInput,
  SubscriptionInvoice,
  SubscriptionInvoicePaymentAccepted,
  SubscriptionInvoicePaymentInput,
  SubscriptionPlan,
} from '@/lib/api/types';

/** Sortie de `GET /subscription-plans` : catalogue global, sans pagination. */
export interface SubscriptionPlansResponse {
  items: SubscriptionPlan[];
}

export interface UseSubscriptionInvoicesParams {
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

/** Catalogue des plans publics et actifs. */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => apiFetch<SubscriptionPlansResponse>('/subscription-plans'),
  });
}

/** Abonnement courant de l'organisation. */
export function useSubscription(organizationId: string | null) {
  return useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: () => apiFetch<Subscription>(`/organizations/${organizationId}/subscription`),
    enabled: Boolean(organizationId),
  });
}

/** Souscription initiale ou changement de plan : met à jour la ligne unique d'abonnement. */
export function useSubscribeOrganization(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubscriptionInput) =>
      apiFetch<Subscription>(`/organizations/${organizationId}/subscription`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', organizationId] });
    },
  });
}

/** Résiliation de l'abonnement courant. Répond 409 `SUBSCRIPTIONS.ALREADY_CANCELLED` si déjà résilié. */
export function useCancelSubscription(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Subscription>(`/organizations/${organizationId}/subscription/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', organizationId] });
    },
  });
}

/** Factures d'abonnement de l'organisation, paginées par curseur. */
export function useSubscriptionInvoices(
  organizationId: string | null,
  params: UseSubscriptionInvoicesParams = {},
) {
  return useQuery({
    queryKey: ['subscription-invoices', organizationId, params],
    queryFn: () =>
      apiFetch<Paginated<SubscriptionInvoice>>(
        `/organizations/${organizationId}/subscription-invoices${buildQuery({
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
    enabled: Boolean(organizationId),
  });
}

/**
 * Paiement Mobile Money d'une facture d'abonnement (202, suivi via le module
 * paiements). Répond 409 `SUBSCRIPTIONS.ALREADY_PAID` si déjà réglée.
 */
export function usePaySubscriptionInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubscriptionInvoicePaymentInput) =>
      apiFetch<SubscriptionInvoicePaymentAccepted>(`/subscription-invoices/${invoiceId}/pay`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
    },
  });
}
