import { DomainError } from '../../src/shared/errors/domain-error';
import { businessDaysBetween } from '../../src/modules/bank-checks/domain/business-days';
import {
  assertCheckTransition,
  CHECK_STATUSES,
  CHECK_TRANSITIONS,
  type CheckStatus,
} from '../../src/modules/bank-checks/domain/check-rules';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Ancre fixe (lundi 5 janvier 2026) : la fonction testée est un simple calcul
 * arithmétique entre deux dates fournies, sans lecture de l'horloge — la
 * valeur précise de l'ancre n'a aucune incidence sur le résultat attendu,
 * seul son jour de semaine compte. Fixer la date supprime la dépendance au
 * jour d'exécution sans rien perdre : rien n'« expire » puisque rien ici ne
 * dépend du calendrier réel.
 */
const MONDAY = new Date(Date.UTC(2026, 0, 5));
/** Dimanche suivant `MONDAY`, dérivé arithmétiquement (jamais périmé). */
const SUNDAY = addDays(MONDAY, 6);

describe('Machine à états d’un chèque (docs/api/phase6-contract.md § Chèques)', () => {
  it('table de transitions exhaustive : chaque paire autorisée passe, toute autre lève BANK.CHECK_INVALID_TRANSITION', () => {
    for (const from of CHECK_STATUSES) {
      for (const to of CHECK_STATUSES) {
        const allowed = (CHECK_TRANSITIONS[from] as readonly CheckStatus[]).includes(to);
        if (allowed) {
          expect(() => assertCheckTransition(from, to)).not.toThrow();
        } else {
          try {
            assertCheckTransition(from, to);
            throw new Error(`Transition ${from} → ${to} aurait dû être refusée.`);
          } catch (error) {
            expect(error).toBeInstanceOf(DomainError);
            expect((error as DomainError).code).toBe('BANK.CHECK_INVALID_TRANSITION');
          }
        }
      }
    }
  });

  it('RECEIVED peut être déposé, annulé ou rendu au tireur', () => {
    expect(CHECK_TRANSITIONS.RECEIVED).toEqual(
      expect.arrayContaining(['DEPOSITED', 'CANCELLED', 'RETURNED']),
    );
    expect(CHECK_TRANSITIONS.RECEIVED).toHaveLength(3);
  });

  it('CANCELLED et RETURNED ne partent QUE de RECEIVED', () => {
    for (const status of CHECK_STATUSES) {
      if (status === 'RECEIVED') continue;
      expect(CHECK_TRANSITIONS[status]).not.toContain('CANCELLED');
      expect(CHECK_TRANSITIONS[status]).not.toContain('RETURNED');
    }
  });

  it('DEPOSITED mène à CLEARED ou BOUNCED, jamais en arrière vers RECEIVED', () => {
    expect(CHECK_TRANSITIONS.DEPOSITED).toEqual(['CLEARED', 'BOUNCED']);
  });

  it('CLEARED ne mène qu’à BOUNCED (contre-passation d’un chèque encaissé)', () => {
    expect(CHECK_TRANSITIONS.CLEARED).toEqual(['BOUNCED']);
  });

  it('BOUNCED, CANCELLED et RETURNED sont terminaux', () => {
    expect(CHECK_TRANSITIONS.BOUNCED).toEqual([]);
    expect(CHECK_TRANSITIONS.CANCELLED).toEqual([]);
    expect(CHECK_TRANSITIONS.RETURNED).toEqual([]);
  });
});

describe('Jours ouvrés écoulés (dépôt du lundi au samedi, dimanche seul jour chômé)', () => {
  it('rend zéro si les dates sont égales ou inversées', () => {
    expect(businessDaysBetween(MONDAY, MONDAY)).toBe(0);
    expect(businessDaysBetween(MONDAY, addDays(MONDAY, -1))).toBe(0);
  });

  it('une semaine pleine (7 jours) contient toujours exactement un dimanche : 6 jours ouvrés', () => {
    expect(businessDaysBetween(MONDAY, addDays(MONDAY, 7))).toBe(6);
  });

  it('deux semaines pleines (14 jours) contiennent toujours exactement deux dimanches : 12 jours ouvrés', () => {
    expect(businessDaysBetween(MONDAY, addDays(MONDAY, 14))).toBe(12);
  });

  it('un dimanche seul (veille samedi → dimanche) ne compte aucun jour ouvré', () => {
    expect(businessDaysBetween(addDays(SUNDAY, -1), SUNDAY)).toBe(0);
  });

  it('vendredi → dimanche compte le samedi ouvré, pas le dimanche', () => {
    expect(businessDaysBetween(addDays(SUNDAY, -2), SUNDAY)).toBe(1);
  });

  it('samedi est un jour ouvré : deux jours consécutifs hors dimanche comptent deux', () => {
    // jeudi -> samedi : vendredi et samedi, tous deux ouvrés.
    expect(businessDaysBetween(addDays(SUNDAY, -3), addDays(SUNDAY, -1))).toBe(2);
  });
});
