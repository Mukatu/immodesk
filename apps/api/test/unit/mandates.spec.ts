import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertActivatable,
  assertMandateEditable,
  assertSuspendable,
  assertTerminable,
  scopesOverlap,
} from '../../src/modules/mandates/domain/mandate-rules';

describe('Chevauchement de périmètre (scopesOverlap)', () => {
  it('deux mandats mono-bien sur le MÊME bien se chevauchent', () => {
    expect(scopesOverlap({ propertyId: 'bien-1' }, { propertyId: 'bien-1' })).toBe(true);
  });

  it('deux mandats mono-bien sur des biens DIFFÉRENTS ne se chevauchent pas', () => {
    expect(scopesOverlap({ propertyId: 'bien-1' }, { propertyId: 'bien-2' })).toBe(false);
  });

  it('un mandat portefeuille (propertyId null) chevauche toujours un mandat du même bailleur', () => {
    expect(scopesOverlap({ propertyId: null }, { propertyId: 'bien-1' })).toBe(true);
    expect(scopesOverlap({ propertyId: 'bien-1' }, { propertyId: null })).toBe(true);
    expect(scopesOverlap({ propertyId: null }, { propertyId: null })).toBe(true);
  });
});

describe('Gardes de transition du mandat', () => {
  it('DRAFT → ACTIVE est autorisé', () => {
    expect(() => assertActivatable('DRAFT')).not.toThrow();
  });

  it('ACTIVE → ACTIVE est refusé (pas de réactivation depuis un autre statut que DRAFT)', () => {
    expect(() => assertActivatable('ACTIVE')).toThrow(DomainError);
    try {
      assertActivatable('SUSPENDED');
      throw new Error('La réactivation depuis SUSPENDED aurait dû être refusée.');
    } catch (error) {
      const domain = error as DomainError;
      expect(domain.code).toBe('AGENCY.MANDATE_INVALID_TRANSITION');
    }
  });

  it('la suspension sans motif est refusée', () => {
    expect(() => assertSuspendable('ACTIVE', undefined)).toThrow(DomainError);
    expect(() => assertSuspendable('ACTIVE', '   ')).toThrow(DomainError);
    expect(() => assertSuspendable('ACTIVE', 'Impayés répétés')).not.toThrow();
  });

  it('la suspension n’est possible que depuis ACTIVE', () => {
    expect(() => assertSuspendable('DRAFT', 'motif')).toThrow(DomainError);
    expect(() => assertSuspendable('SUSPENDED', 'motif')).toThrow(DomainError);
  });

  it('la résiliation sans date d’effet est refusée, même avec un motif', () => {
    expect(() => assertTerminable('ACTIVE', undefined, 'Fin de mandat')).toThrow(DomainError);
    try {
      assertTerminable('ACTIVE', undefined, 'Fin de mandat');
      throw new Error('La résiliation sans date d’effet aurait dû être refusée.');
    } catch (error) {
      const domain = error as DomainError;
      expect(domain.code).toBe('AGENCY.MANDATE_TERMINATION_DATE_REQUIRED');
    }
  });

  it('la résiliation sans motif est refusée, même avec une date d’effet', () => {
    expect(() => assertTerminable('ACTIVE', '2026-10-01', undefined)).toThrow(DomainError);
  });

  it('la résiliation est possible depuis ACTIVE ou SUSPENDED, avec date et motif', () => {
    expect(() => assertTerminable('ACTIVE', '2026-10-01', 'Fin de mandat')).not.toThrow();
    expect(() => assertTerminable('SUSPENDED', '2026-10-01', 'Fin de mandat')).not.toThrow();
    expect(() => assertTerminable('DRAFT', '2026-10-01', 'Fin de mandat')).toThrow(DomainError);
    expect(() => assertTerminable('TERMINATED', '2026-10-01', 'Fin de mandat')).toThrow(
      DomainError,
    );
  });

  it('DRAFT, ACTIVE et SUSPENDED restent modifiables par PATCH ; TERMINATED et EXPIRED non', () => {
    expect(() => assertMandateEditable('DRAFT')).not.toThrow();
    expect(() => assertMandateEditable('ACTIVE')).not.toThrow();
    expect(() => assertMandateEditable('SUSPENDED')).not.toThrow();
    expect(() => assertMandateEditable('TERMINATED')).toThrow(DomainError);
    expect(() => assertMandateEditable('EXPIRED')).toThrow(DomainError);
  });
});
