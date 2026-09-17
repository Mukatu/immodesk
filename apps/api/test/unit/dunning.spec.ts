import { parseIsoDate } from '../../src/modules/leases/domain/calendar';
import type {
  DunningInvoiceState,
  DunningRuleTerms,
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
    issueDate: d('2026-08-25'),
    graceUntilDate: d('2026-09-10'),
    balanceAmount: 100_000n,
    ...overrides,
  };
}

describe('Jours de retard (daysOverdueOf)', () => {
  it('est positif après l’échéance, négatif avant, nul le jour même', () => {
    expect(daysOverdueOf(d('2026-09-05'), d('2026-09-08'))).toBe(3);
    expect(daysOverdueOf(d('2026-09-05'), d('2026-09-01'))).toBe(-4);
    expect(daysOverdueOf(d('2026-09-05'), d('2026-09-05'))).toBe(0);
  });
});

describe('Sélection de palier — DAYS_AFTER_DUE', () => {
  it('matche exactement le jour dueDate + offsetDays, jamais avant ni après', () => {
    const r = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 3 });
    const inv = invoice({ dueDate: d('2026-09-05') });
    expect(matchesToday(r, inv, d('2026-09-08'))).toBe(true);
    expect(matchesToday(r, inv, d('2026-09-07'))).toBe(false);
    expect(matchesToday(r, inv, d('2026-09-09'))).toBe(false);
  });
});

describe('Sélection de palier — DAYS_BEFORE_DUE', () => {
  it('matche exactement offsetDays jours avant l’échéance (rappel courtois)', () => {
    const r = rule({ triggerType: 'DAYS_BEFORE_DUE', offsetDays: 2 });
    const inv = invoice({ dueDate: d('2026-09-05') });
    expect(matchesToday(r, inv, d('2026-09-03'))).toBe(true);
    expect(matchesToday(r, inv, d('2026-09-04'))).toBe(false);
  });
});

describe('Sélection de palier — ON_ISSUE', () => {
  it('matche le jour de l’émission (offsetDays = 0 par défaut)', () => {
    const r = rule({ triggerType: 'ON_ISSUE', offsetDays: 0 });
    const inv = invoice({ issueDate: d('2026-08-25') });
    expect(matchesToday(r, inv, d('2026-08-25'))).toBe(true);
    expect(matchesToday(r, inv, d('2026-08-26'))).toBe(false);
  });
});

describe('Sélection de palier — ON_OVERDUE', () => {
  it('matche le lendemain de la fin de tolérance (bascule OVERDUE)', () => {
    const r = rule({ triggerType: 'ON_OVERDUE', offsetDays: 0 });
    const inv = invoice({ graceUntilDate: d('2026-09-10') });
    expect(matchesToday(r, inv, d('2026-09-11'))).toBe(true);
    expect(matchesToday(r, inv, d('2026-09-10'))).toBe(false);
  });

  it('retombe sur dueDate si le bail ne porte aucune tolérance', () => {
    const r = rule({ triggerType: 'ON_OVERDUE', offsetDays: 0 });
    const inv = invoice({ dueDate: d('2026-09-05'), graceUntilDate: null });
    expect(matchesToday(r, inv, d('2026-09-06'))).toBe(true);
  });
});

describe('skipWeekends — report au lundi', () => {
  it('reporte un palier tombant un samedi ou un dimanche au lundi suivant', () => {
    // 2026-09-05 est un samedi ; +2 jours (dimanche) et +3 jours (lundi) le confirment.
    const saturday = d('2026-09-05');
    expect(saturday.getUTCDay()).toBe(6);

    const r = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 0, skipWeekends: true });
    const inv = invoice({ dueDate: saturday });
    // Le jour naturel (samedi) ne matche plus : reporté au lundi 2026-09-07.
    expect(matchesToday(r, inv, saturday)).toBe(false);
    expect(matchesToday(r, inv, d('2026-09-07'))).toBe(true);
    expect(effectiveTriggerDate(r, inv).toISOString().slice(0, 10)).toBe('2026-09-07');
  });

  it('un dimanche est aussi reporté au lundi', () => {
    const sunday = d('2026-09-06');
    expect(sunday.getUTCDay()).toBe(0);
    const r = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 0, skipWeekends: true });
    const inv = invoice({ dueDate: sunday });
    expect(matchesToday(r, inv, d('2026-09-07'))).toBe(true);
  });

  it('ne change rien à un palier tombant un jour ouvré', () => {
    const monday = d('2026-09-07');
    expect(monday.getUTCDay()).toBe(1);
    const r = rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 0, skipWeekends: true });
    const inv = invoice({ dueDate: monday });
    expect(matchesToday(r, inv, monday)).toBe(true);
  });
});

describe('isBelowMinimum', () => {
  it('compare le solde de la facture au minimum de la règle', () => {
    const r = rule({ minBalanceAmount: 50_000n });
    expect(isBelowMinimum(r, invoice({ balanceAmount: 10_000n }))).toBe(true);
    expect(isBelowMinimum(r, invoice({ balanceAmount: 50_000n }))).toBe(false);
    expect(isBelowMinimum(r, invoice({ balanceAmount: 100_000n }))).toBe(false);
  });
});

describe('selectMatchingRule', () => {
  it('sélectionne la règle dont le palier correspond exactement, seuil ignoré', () => {
    const rules = [
      rule({ id: 'r3', stepOrder: 3, triggerType: 'DAYS_AFTER_DUE', offsetDays: 10 }),
      rule({ id: 'r1', stepOrder: 1, triggerType: 'DAYS_AFTER_DUE', offsetDays: 3 }),
    ];
    const inv = invoice({ dueDate: d('2026-09-05'), balanceAmount: 1n });
    const match = selectMatchingRule(rules, inv, d('2026-09-08'));
    expect(match?.id).toBe('r1');
  });

  it('renvoie null si aucun palier ne correspond exactement', () => {
    const rules = [rule({ triggerType: 'DAYS_AFTER_DUE', offsetDays: 3 })];
    const inv = invoice({ dueDate: d('2026-09-05') });
    expect(selectMatchingRule(rules, inv, d('2026-09-06'))).toBeNull();
  });

  it('à égalité de jour, le rang le plus bas l’emporte', () => {
    const rules = [
      rule({ id: 'high', stepOrder: 5, triggerType: 'ON_ISSUE', offsetDays: 0 }),
      rule({ id: 'low', stepOrder: 1, triggerType: 'DAYS_AFTER_DUE', offsetDays: 0 }),
    ];
    // issueDate et dueDate coïncident : les deux règles matchent le même jour.
    const inv = invoice({ issueDate: d('2026-09-05'), dueDate: d('2026-09-05') });
    expect(selectMatchingRule(rules, inv, d('2026-09-05'))?.id).toBe('low');
  });
});

describe('Heure locale Africa/Brazzaville (fixe, sans heure d’été)', () => {
  it('brazzavilleHourOf ajoute une heure à l’UTC', () => {
    expect(brazzavilleHourOf(new Date('2026-09-08T08:00:00.000Z'))).toBe(9);
    expect(brazzavilleHourOf(new Date('2026-09-08T23:30:00.000Z'))).toBe(0);
  });

  it('isHourReached refuse tout envoi avant l’heure configurée', () => {
    const r = rule({ sendHourLocal: 9 });
    expect(isHourReached(r, 8)).toBe(false);
    expect(isHourReached(r, 9)).toBe(true);
    expect(isHourReached(r, 14)).toBe(true);
  });
});
