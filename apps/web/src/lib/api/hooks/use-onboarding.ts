import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type {
  OnboardingIndependentManagerInput,
  OnboardingIndependentManagerResult,
} from '@/lib/api/types';

/** Onboarding du gestionnaire indépendant : organisation, bailleur, bien et mandat en un appel. */
export function useOnboardIndependentManager() {
  return useMutation({
    mutationFn: (body: OnboardingIndependentManagerInput) =>
      apiFetch<OnboardingIndependentManagerResult>(
        '/organizations/independent-manager/onboarding',
        { method: 'POST', body },
      ),
  });
}
