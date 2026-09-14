import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertDeclarationTransition,
  businessHoursElapsed,
  DECLARATION_TRANSITIONS,
} from '../../src/modules/bank-transfers/domain/bank-transfer-rules';

describe('Machine à états d’une déclaration de virement', () => {
  it('SUBMITTED peut être instruite, validée, rejetée ou retirée', () => {
    expect(() => assertDeclarationTransition('SUBMITTED', 'UNDER_REVIEW')).not.toThrow();
    expect(() => assertDeclarationTransition('SUBMITTED', 'APPROVED')).not.toThrow();
    expect(() => assertDeclarationTransition('SUBMITTED', 'REJECTED')).not.toThrow();
    expect(() => assertDeclarationTransition('SUBMITTED', 'CANCELLED')).not.toThrow();
  });

  it('UNDER_REVIEW ne revient pas à SUBMITTED', () => {
    expect(() => assertDeclarationTransition('UNDER_REVIEW', 'SUBMITTED')).toThrow(DomainError);
  });

  it('MATCHED est réservé à la phase 6 : aucune transition n’y mène ni n’en part', () => {
    expect(DECLARATION_TRANSITIONS.MATCHED).toEqual([]);
    for (const from of Object.keys(
      DECLARATION_TRANSITIONS,
    ) as (keyof typeof DECLARATION_TRANSITIONS)[]) {
      expect(DECLARATION_TRANSITIONS[from]).not.toContain('MATCHED');
    }
  });

  it('APPROVED, REJECTED et CANCELLED sont terminaux', () => {
    expect(DECLARATION_TRANSITIONS.APPROVED).toEqual([]);
    expect(DECLARATION_TRANSITIONS.REJECTED).toEqual([]);
    expect(DECLARATION_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe('Ancienneté en heures ouvrées', () => {
  it('compte les heures ouvrées un jour de semaine (08h-18h)', () => {
    const from = new Date('2026-09-14T08:00:00Z'); // lundi
    const to = new Date('2026-09-14T12:00:00Z');
    expect(businessHoursElapsed(from, to)).toBe(4);
  });

  it('exclut les heures hors 08h-18h', () => {
    const from = new Date('2026-09-14T20:00:00Z');
    const to = new Date('2026-09-15T08:00:00Z');
    expect(businessHoursElapsed(from, to)).toBe(0);
  });

  it('exclut le dimanche', () => {
    const from = new Date('2026-09-13T08:00:00Z'); // dimanche
    const to = new Date('2026-09-13T18:00:00Z');
    expect(businessHoursElapsed(from, to)).toBe(0);
  });

  it('rend zéro si les dates sont inversées', () => {
    expect(
      businessHoursElapsed(new Date('2026-09-14T10:00:00Z'), new Date('2026-09-14T08:00:00Z')),
    ).toBe(0);
  });
});
