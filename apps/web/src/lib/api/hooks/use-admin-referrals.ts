import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  AtRiskSubscription,
  Paginated,
  ReferralCommissionsApproveInput,
  ReferralCommissionsApproveResult,
  ReferralPayout,
  ReferralPayoutsCreateAccepted,
  ReferralPayoutsCreateInput,
} from '@/lib/api/types';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * POST /admin/referral-commissions/approve : approbation des commissions accumulées
 * (rôle OWNER plateforme). Invalide les commissions du/des partenaire(s) concerné(s).
 */
export function useApproveReferralCommissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReferralCommissionsApproveInput) =>
      apiFetch<ReferralCommissionsApproveResult>('/admin/referral-commissions/approve', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-partner', 'me', 'commissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'referral-commissions'] });
    },
  });
}

/** POST /admin/referral-payouts : déclenchement d'un versement groupé (202, traitement asynchrone). */
export function useCreateReferralPayouts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReferralPayoutsCreateInput) =>
      apiFetch<ReferralPayoutsCreateAccepted>('/admin/referral-payouts', {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'referral-payouts'] });
    },
  });
}

/** GET /admin/referral-payouts/{id} : détail d'un versement par lot. */
export function useReferralPayout(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'referral-payouts', id],
    queryFn: () => apiFetch<ReferralPayout>(`/admin/referral-payouts/${id}`),
    enabled: Boolean(id),
  });
}

export interface UseAtRiskSubscriptionsParams {
  limit?: number;
  cursor?: string;
}

/** GET /admin/subscriptions/at-risk : abonnements à risque (impayés, dépassement de délai). */
export function useAtRiskSubscriptions(params: UseAtRiskSubscriptionsParams = {}) {
  return useQuery({
    queryKey: ['admin', 'subscriptions', 'at-risk', params],
    queryFn: () =>
      apiFetch<Paginated<AtRiskSubscription>>(
        `/admin/subscriptions/at-risk${buildQuery({
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}
