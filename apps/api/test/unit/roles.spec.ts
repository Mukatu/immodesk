import {
  MEMBER_ROLES,
  ROLE_RANK,
  isMemberRole,
  roleSatisfies,
  satisfiesAnyRole,
} from '../../src/shared/tenant/roles';
import { assertNotLastOwner } from '../../src/modules/organizations/domain/membership-rules';
import { DomainError } from '../../src/shared/errors/domain-error';
import type { MemberRole } from '../../src/shared/tenant/tenant-context';

describe('Hiérarchie des rôles', () => {
  it('ordonne OWNER > MANAGER > {ACCOUNTANT, COLLECTOR} > VIEWER', () => {
    expect(ROLE_RANK.OWNER).toBeGreaterThan(ROLE_RANK.MANAGER);
    expect(ROLE_RANK.MANAGER).toBeGreaterThan(ROLE_RANK.ACCOUNTANT);
    expect(ROLE_RANK.ACCOUNTANT).toBe(ROLE_RANK.COLLECTOR);
    expect(ROLE_RANK.COLLECTOR).toBeGreaterThan(ROLE_RANK.VIEWER);
  });

  it('satisfait toute exigence de rang inférieur', () => {
    expect(roleSatisfies('OWNER', 'MANAGER')).toBe(true);
    expect(roleSatisfies('OWNER', 'VIEWER')).toBe(true);
    expect(roleSatisfies('MANAGER', 'VIEWER')).toBe(true);
    expect(roleSatisfies('COLLECTOR', 'VIEWER')).toBe(true);
  });

  it('ne satisfait pas une exigence de rang supérieur', () => {
    expect(roleSatisfies('MANAGER', 'OWNER')).toBe(false);
    expect(roleSatisfies('VIEWER', 'COLLECTOR')).toBe(false);
    expect(roleSatisfies('COLLECTOR', 'MANAGER')).toBe(false);
  });

  it('satisfait toujours sa propre exigence', () => {
    for (const role of MEMBER_ROLES) {
      expect(roleSatisfies(role, role)).toBe(true);
    }
  });

  it("ne substitue PAS ACCOUNTANT et COLLECTOR l'un à l'autre malgré leur rang égal", () => {
    // Règle métier : même rang, périmètres disjoints (lecture financière
    // contre encaissement terrain). L'appartenance doit être explicite.
    expect(roleSatisfies('ACCOUNTANT', 'COLLECTOR')).toBe(false);
    expect(roleSatisfies('COLLECTOR', 'ACCOUNTANT')).toBe(false);
  });

  it('résout une exigence multiple par satisfaction d’au moins un rôle', () => {
    expect(satisfiesAnyRole('MANAGER', ['OWNER', 'MANAGER'])).toBe(true);
    expect(satisfiesAnyRole('COLLECTOR', ['OWNER', 'MANAGER'])).toBe(false);
    expect(satisfiesAnyRole('OWNER', ['ACCOUNTANT'])).toBe(true);
    expect(satisfiesAnyRole('ACCOUNTANT', ['COLLECTOR'])).toBe(false);
  });

  it('traite une exigence vide comme « authentifié dans l’organisation »', () => {
    expect(satisfiesAnyRole('VIEWER', [])).toBe(true);
  });

  it('valide la reconnaissance d’un rôle', () => {
    expect(isMemberRole('OWNER')).toBe(true);
    expect(isMemberRole('SUPERADMIN')).toBe(false);
    expect(isMemberRole(42)).toBe(false);
  });
});

describe('Protection du dernier OWNER', () => {
  const cases: Array<[string, MemberRole, MemberRole | null, number, boolean]> = [
    ['rétrograder le dernier OWNER', 'OWNER', 'MANAGER', 1, true],
    ['retirer le dernier OWNER', 'OWNER', null, 1, true],
    ['rétrograder un OWNER parmi deux', 'OWNER', 'MANAGER', 2, false],
    ['retirer un OWNER parmi deux', 'OWNER', null, 2, false],
    ['retirer un MANAGER', 'MANAGER', null, 1, false],
    ['promouvoir un VIEWER en OWNER', 'VIEWER', 'OWNER', 1, false],
    ['laisser un OWNER OWNER', 'OWNER', 'OWNER', 1, false],
  ];

  it.each(cases)(
    '%s → refus attendu : %s',
    (_label, currentRole, nextRole, owners, shouldThrow) => {
      const run = () => assertNotLastOwner({ activeOwnerCount: owners, currentRole, nextRole });
      if (shouldThrow) {
        expect(run).toThrow(DomainError);
        try {
          run();
        } catch (error) {
          expect((error as DomainError).code).toBe('ORG.LAST_OWNER');
          expect((error as DomainError).status).toBe(409);
        }
      } else {
        expect(run).not.toThrow();
      }
    },
  );
});
