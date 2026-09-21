/**
 * État d'avancement de l'onboarding guidé (contrat phase 10, § « Onboarding
 * guidé ») : DÉRIVÉ, jamais stocké. Une étape est faite si l'entité
 * correspondante existe pour l'organisation — aucune colonne de progression.
 *
 * Domaine pur : les compteurs sont lus par l'appelant (requêtes Prisma sous
 * RLS), cette fonction ne fait que les traduire en trois booléens.
 */
export interface OnboardingStateCounts {
  propertiesCount: number;
  leasesCount: number;
  invitationsCount: number;
}

export interface OnboardingStateView {
  firstPropertyDone: boolean;
  firstLeaseDone: boolean;
  inviteDone: boolean;
}

export function computeOnboardingState(counts: OnboardingStateCounts): OnboardingStateView {
  return {
    firstPropertyDone: counts.propertiesCount > 0,
    firstLeaseDone: counts.leasesCount > 0,
    inviteDone: counts.invitationsCount > 0,
  };
}
