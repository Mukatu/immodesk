import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Paginated,
  Referral,
  ReferralCodeInput,
  ReferralCommissionsResponse,
  ReferralPartner,
  ReferralPartnerInput,
  ReferralPropertyConfirmInput,
  ReferralPropertyRegistrationAccepted,
  ReferralPropertyRegistrationInput,
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

/** POST /referral-partners : inscription d'un apporteur d'affaires (statut initial PENDING_VERIFICATION). */
export function useCreateReferralPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReferralPartnerInput) =>
      apiFetch<ReferralPartner>('/referral-partners', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-partner', 'me'] });
    },
  });
}

/** GET /referral-partners/me : profil de l'apporteur d'affaires connecté. */
export function useReferralPartnerMe() {
  return useQuery({
    queryKey: ['referral-partner', 'me'],
    queryFn: () => apiFetch<ReferralPartner>('/referral-partners/me'),
  });
}

/**
 * POST /organizations/{id}/referral-code : saisie du code à l'inscription.
 * Peut répondre 422 REFERRALS.SELF_REFERRAL ou 409 (organisation déjà parrainée) —
 * laissés à la charge de l'appelant via ApiError.
 */
export function useSubmitReferralCode(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReferralCodeInput) =>
      apiFetch<Referral>(`/organizations/${organizationId}/referral-code`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-partner', 'me', 'referrals'] });
    },
  });
}

/**
 * POST /referral-partners/me/properties : enregistrement d'un bien par le partenaire.
 * N'engendre aucune ligne Referral avant confirmation OTP par le bailleur.
 */
export function useRegisterReferralProperty() {
  return useMutation({
    mutationFn: (body: ReferralPropertyRegistrationInput) =>
      apiFetch<ReferralPropertyRegistrationAccepted>('/referral-partners/me/properties', {
        method: 'POST',
        body,
      }),
  });
}

/**
 * POST /referral-partners/me/properties/{id}/confirm-otp : confirmation par le bailleur
 * (route publique, appelée hors session partenaire — skipAuth: true).
 */
export function useConfirmReferralPropertyOtp(registrationId: string) {
  return useMutation({
    mutationFn: (body: ReferralPropertyConfirmInput) =>
      apiFetch<Referral>(`/referral-partners/me/properties/${registrationId}/confirm-otp`, {
        method: 'POST',
        body,
        skipAuth: true,
      }),
  });
}

export interface UseReferralPartnerReferralsParams {
  limit?: number;
  cursor?: string;
}

/** GET /referral-partners/me/referrals : parrainages du partenaire connecté. */
export function useReferralPartnerReferrals(params: UseReferralPartnerReferralsParams = {}) {
  return useQuery({
    queryKey: ['referral-partner', 'me', 'referrals', params],
    queryFn: () =>
      apiFetch<Paginated<Referral>>(
        `/referral-partners/me/referrals${buildQuery({
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}

export interface UseReferralPartnerCommissionsParams {
  limit?: number;
  cursor?: string;
}

/**
 * GET /referral-partners/me/commissions : commissions du partenaire connecté.
 * Réponse { items, totals } — pas un Paginated<T> classique (pas de pageInfo).
 */
export function useReferralPartnerCommissions(params: UseReferralPartnerCommissionsParams = {}) {
  return useQuery({
    queryKey: ['referral-partner', 'me', 'commissions', params],
    queryFn: () =>
      apiFetch<ReferralCommissionsResponse>(
        `/referral-partners/me/commissions${buildQuery({
          limit: params.limit,
          cursor: params.cursor,
        })}`,
      ),
  });
}
