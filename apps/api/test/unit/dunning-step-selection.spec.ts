import { parseIsoDate } from '../../src/modules/leases/domain/calendar';
import {
  DUNNING_SKIP_REASONS,
  type DunningInvoiceState,
  type DunningRuleTerms,
} from '../../src/modules/dunning/domain/dunning-types';
import {
  brazzavilleHourOf,
  daysOverdueOf,
  effectiveTriggerDate,
  isBelowMinimum,
  isHourReached,
  matchesToday,
  selectMatchingRule,
} from '../../src/modules/dunning/domain/step-selection';

const d = parseIsoDate;

/**
 * Toutes les dates de ce fichier sont des ancres explicites (`2026-09-xx`),
 * jamais dérivées de `new Date()` — le moteur de relance est le plus exposé
 * du projet à un calcul de retard qui varie avec le jour d'exécution des
 * tests (piège documenté par le donneur d'ordre).
 */
function rule(overrides: Partial<DunningRuleTerms> = {}): DunningRuleTerms {
  return {
    id: 'rule-1',
    stepOrder: 1,
    triggerType: 'DAYS_AFTER_DUE',
    offsetDays: 3,
    minBalanceAmount: 0n,
    sendHourLocal: 9,
    skipWeekends: false,
    ...overrides,
  };
}

function invoice(overrides: Partial<DunningInvoiceState> = {}): DunningInvoiceState {
  return {
    dueDate: d('2026-09-05'),
    issueDate: d('2026-09-01'),
    graceUntilDate: d('2026-09-10'),
    balanceAmount: 100_000n,
    ...overrides,
  };
}

describe('daysOverdueOf — jours de retard signés', () => {
  it('positif après échéance, négatif avant, nul le jour même', () => {
    expect(daysOverdueOf(d('2026-09-05'), d('2026-09-08'))).toBe(3);
    expect(daysOverdueOf(d('2026-09-05'), d('2026-09-01'))).toBe(-4);
    expect(daysOverdueOf(d('2026-09-05'), d('2026-09-05'))).toBe(0);
  });
});

describe('effectiveTriggerDate et matchesToday — sélection de palier', () => {
  it('DAYS_AFTER_DUE : décalage après échéance', () => {
    const r = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 3 });
    expect(effectiveTriggerDate(r, invoice())).toEqual(d('2026-09-08'));
    expect(matchesToday(r, invoice(), d('2026-09-08'))).toBe(true);
    expect(matchesToday(r, invoice(), d('2026-09-07'))).toBe(false);
    expect(matchesToday(r, invoice(), d('2026-09-09'))).toBe(false);
  });

  it('DAYS_BEFORE_DUE : rappel courtois avant échéance', () => {
    const r = rule({ triggerType: 'DAYS_BEFORE_DUE', offsetDays: 2 });
    expect(effectiveTriggerDate(r, invoice())).toEqual(d('2026-09-03'));
    expect(matchesToday(r, invoice(), d('2026-09-03'))).toBe(true);
  });

  it('ON_ISSUE : décalage depuis l’émission, 0 = jour même', () => {
    const r = rule({ triggerType: 'ON_ISSUE', offsetDays: 0 });
    expect(matchesToday(r, invoice(), d('2026-09-01'))).toBe(true);
    const later = rule({ triggerType: 'ON_ISSUE', offsetDays: 5 });
    expect(matchesToday(later, invoice(), d('2026-09-06'))).toBe(true);
  });

  it('ON_OVERDUE : lendemain de la fin de tolérance', () => {
    const r = rule({ triggerType: 'ON_OVERDUE', offsetDays: 0 });
    expect(matchesToday(r, invoice(), d('2026-09-11'))).toBe(true);
    expect(matchesToday(r, invoice(), d('2026-09-10'))).toBe(false);
  });

  it('skipWeekends : samedi et dimanche reportés au lundi suivant', () => {
    // 2026-09-05 est un samedi ; échéance + 0 jour tombe donc un samedi.
    const saturdayRule = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 0, skipWeekends: true });
    expect(effectiveTriggerDate(saturdayRule, invoice())).toEqual(d('2026-09-07')); // lundi
    expect(matchesToday(saturdayRule, invoice(), d('2026-09-07'))).toBe(true);
    expect(matchesToday(saturdayRule, invoice(), d('2026-09-05'))).toBe(false);

    // 2026-09-06 (dimanche) → lundi 2026-09-07 également.
    const sundayRule = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 1, skipWeekends: true });
    expect(effectiveTriggerDate(sundayRule, invoice())).toEqual(d('2026-09-07'));

    // Un jour de semaine n'est jamais décalé.
    const weekdayRule = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 3, skipWeekends: true });
    expect(effectiveTriggerDate(weekdayRule, invoice())).toEqual(d('2026-09-08')); // mardi
  });

  it('isBelowMinimum : compare le solde de la facture au seuil de la règle', () => {
    const r = rule({ minBalanceAmount: 50_000n });
    expect(isBelowMinimum(r, invoice({ balanceAmount: 10_000n }))).toBe(true);
    expect(isBelowMinimum(r, invoice({ balanceAmount: 50_000n }))).toBe(false);
    expect(isBelowMinimum(r, invoice({ balanceAmount: 60_000n }))).toBe(false);
  });

  it('selectMatchingRule : un seul palier par rang, le plus petit rang gagne à égalité', () => {
    const early = rule({ id: 'j3', stepOrder: 1, offsetDays: 3 });
    const late = rule({ id: 'j10', stepOrder: 2, offsetDays: 10 });
    expect(selectMatchingRule([late, early], invoice(), d('2026-09-08'))?.id).toBe('j3');
    expect(selectMatchingRule([late, early], invoice(), d('2026-09-15'))?.id).toBe('j10');
    expect(selectMatchingRule([late, early], invoice(), d('2026-09-06'))).toBeNull();
  });
});

describe('Heure locale Africa/Brazzaville (UTC+1 fixe)', () => {
  it('brazzavilleHourOf décale d’une heure, y compris au passage de minuit', () => {
    expect(brazzavilleHourOf(new Date('2026-09-05T08:00:00.000Z'))).toBe(9);
    expect(brazzavilleHourOf(new Date('2026-09-05T23:30:00.000Z'))).toBe(0);
  });

  it('isHourReached : jamais avant l’heure configurée, toujours après', () => {
    const r = rule({ sendHourLocal: 9 });
    expect(isHourReached(r, 8)).toBe(false);
    expect(isHourReached(r, 9)).toBe(true);
    expect(isHourReached(r, 14)).toBe(true);
  });
});

describe('Motifs d’ignorance lisibles en français', () => {
  it('chaque motif est un texte non vide, distinct des autres', () => {
    const values = Object.values(DUNNING_SKIP_REASONS);
    expect(new Set(values).size).toBe(values.length);
    for (const message of values) expect(message.length).toBeGreaterThan(5);
  });
});
