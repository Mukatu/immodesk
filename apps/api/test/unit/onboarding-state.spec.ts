import {
  computeOnboardingState,
  type OnboardingStateCounts,
} from '../../src/modules/onboarding/domain/state';

describe('Onboarding guidé — état dérivé (domaine pur)', () => {
  const ZERO: OnboardingStateCounts = {
    propertiesCount: 0,
    leasesCount: 0,
    invitationsCount: 0,
  };

  it('aucune entité : les trois étapes sont à faire', () => {
    expect(computeOnboardingState(ZERO)).toEqual({
      firstPropertyDone: false,
      firstLeaseDone: false,
      inviteDone: false,
    });
  });

  it('un bien seul : seule la première étape est faite', () => {
    expect(computeOnboardingState({ ...ZERO, propertiesCount: 1 })).toEqual({
      firstPropertyDone: true,
      firstLeaseDone: false,
      inviteDone: false,
    });
  });

  it('les trois entités existent : les trois étapes sont faites', () => {
    expect(
      computeOnboardingState({ propertiesCount: 2, leasesCount: 1, invitationsCount: 3 }),
    ).toEqual({
      firstPropertyDone: true,
      firstLeaseDone: true,
      inviteDone: true,
    });
  });
});
