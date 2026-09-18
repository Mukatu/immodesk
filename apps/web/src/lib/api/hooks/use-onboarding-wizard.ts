import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  Invitation,
  Lease,
  OnboardingFirstLeaseInput,
  OnboardingFirstPropertyInput,
  OnboardingInviteInput,
  OnboardingState,
  Property,
} from '@/lib/api/types';

/**
 * Onboarding guidé (phase 10) : premier bien, premier bail, première
 * invitation. Distinct de `useOnboardIndependentManager` (use-onboarding.ts),
 * qui couvre un autre flux et n'est pas modifié ici.
 */

/** État d'avancement des trois étapes de l'onboarding guidé. */
export function useOnboardingWizardState(organizationId: string | null) {
  return useQuery({
    queryKey: ['onboarding-state', organizationId],
    queryFn: () => apiFetch<OnboardingState>(`/onboarding/${organizationId}/state`),
    enabled: Boolean(organizationId),
  });
}

/** Étape « premier bien » : mêmes champs et validation que `PropertyInput`. */
export function useOnboardingFirstProperty(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OnboardingFirstPropertyInput) =>
      apiFetch<Property>(`/onboarding/${organizationId}/first-property`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-state', organizationId] });
    },
  });
}

/** Étape « premier bail » : mêmes champs et validation que `LeaseInput`. */
export function useOnboardingFirstLease(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OnboardingFirstLeaseInput) =>
      apiFetch<Lease>(`/onboarding/${organizationId}/first-lease`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-state', organizationId] });
    },
  });
}

/** Étape « première invitation » : mêmes champs que l'invitation d'un membre. */
export function useOnboardingInvite(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OnboardingInviteInput) =>
      apiFetch<Invitation>(`/onboarding/${organizationId}/invite`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-state', organizationId] });
    },
  });
}
