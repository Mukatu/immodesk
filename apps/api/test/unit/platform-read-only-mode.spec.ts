import {
  assertReadOnlyTransition,
  assertReasonRequiredOnEnable,
  ReadOnlyAlreadySetError,
} from '../../src/modules/platform/domain/read-only-mode';

/**
 * Tests unitaires purs (`jest.unit.config.js`) : bascule en lecture seule
 * (docs/api/phase11-contract.md, § 11.C, arbitrages 12 et 14).
 */
describe('assertReadOnlyTransition', () => {
  it('laisse passer une vraie bascule (inactif -> actif)', () => {
    expect(() => assertReadOnlyTransition(false, true)).not.toThrow();
  });

  it('laisse passer une vraie bascule (actif -> inactif)', () => {
    expect(() => assertReadOnlyTransition(true, false)).not.toThrow();
  });

  it('refuse de réactiver un mode déjà actif', () => {
    expect(() => assertReadOnlyTransition(true, true)).toThrow(ReadOnlyAlreadySetError);
  });

  it('refuse de désactiver un mode déjà inactif : ce n’est pas un compteur', () => {
    expect(() => assertReadOnlyTransition(false, false)).toThrow(ReadOnlyAlreadySetError);
  });
});

describe('assertReasonRequiredOnEnable', () => {
  it('exige un motif non vide à l’activation', () => {
    expect(() => assertReasonRequiredOnEnable(true, undefined)).toThrow(RangeError);
    expect(() => assertReasonRequiredOnEnable(true, '')).toThrow(RangeError);
    expect(() => assertReasonRequiredOnEnable(true, '   ')).toThrow(RangeError);
    expect(() => assertReasonRequiredOnEnable(true, 'Panne base de données')).not.toThrow();
  });

  it('n’exige aucun motif à la désactivation', () => {
    expect(() => assertReasonRequiredOnEnable(false, undefined)).not.toThrow();
    expect(() => assertReasonRequiredOnEnable(false, null)).not.toThrow();
  });
});
