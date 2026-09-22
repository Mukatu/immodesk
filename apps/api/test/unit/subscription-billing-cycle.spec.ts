import {
  computePeriodEnd,
  computeTrialEndsAt,
  intervalMonths,
  nextPeriodStart,
  type BillingInterval,
} from '../../src/modules/subscriptions/domain/subscription-billing-cycle';

/**
 * Calendrier de facturation (contrat phase 10, § « Facturation »). Domaine
 * pur, dates civiles à minuit UTC. Toutes les dates sont des littéraux ISO
 * explicites — aucune dérivée de `new Date()`.
 */
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date): string => date.toISOString().slice(0, 10);

describe('intervalMonths', () => {
  it.each<[BillingInterval, number]>([
    ['MONTHLY', 1],
    ['QUARTERLY', 3],
    ['ANNUAL', 12],
  ])('%s → %s mois', (interval, months) => {
    expect(intervalMonths(interval)).toBe(months);
  });
});

describe('computePeriodEnd — dernier jour AVANT le début de la période suivante', () => {
  it('MONTHLY : un mois civil complet', () => {
    expect(iso(computePeriodEnd(d('2026-09-01'), 'MONTHLY'))).toBe('2026-09-30');
  });

  it('QUARTERLY : trois mois civils', () => {
    expect(iso(computePeriodEnd(d('2026-01-01'), 'QUARTERLY'))).toBe('2026-03-31');
  });

  it('ANNUAL : douze mois civils', () => {
    expect(iso(computePeriodEnd(d('2026-01-01'), 'ANNUAL'))).toBe('2026-12-31');
  });

  it('un départ en cours de mois retombe la veille du même jour, un mois plus tard', () => {
    expect(iso(computePeriodEnd(d('2026-09-15'), 'MONTHLY'))).toBe('2026-10-14');
  });

  it('gère un départ le 31 malgré un mois cible plus court', () => {
    // 31 janvier + 1 mois → addMonths retombe sur le dernier jour de février
    // (calendrier déjà éprouvé de `leases/domain/calendar.ts`) ; period_end
    // est le jour précédent.
    expect(iso(computePeriodEnd(d('2026-01-31'), 'MONTHLY'))).toBe('2026-02-27');
  });
});

describe('nextPeriodStart — le lendemain de la fin de période', () => {
  it('enchaîne exactement sans trou ni chevauchement', () => {
    const periodEnd = computePeriodEnd(d('2026-09-01'), 'MONTHLY');
    expect(iso(nextPeriodStart(periodEnd))).toBe('2026-10-01');
  });

  it('franchit une fin d’année civile', () => {
    expect(iso(nextPeriodStart(d('2026-12-31')))).toBe('2027-01-01');
  });
});

describe('computeTrialEndsAt', () => {
  it('ajoute trial_days jours civils à la date de souscription', () => {
    expect(iso(computeTrialEndsAt(d('2026-09-01'), 14))).toBe('2026-09-15');
  });

  it('un plan sans essai (trial_days = 0) ancre la première échéance le jour même', () => {
    expect(iso(computeTrialEndsAt(d('2026-09-01'), 0))).toBe('2026-09-01');
  });

  it('ignore un trial_days négatif ou fractionnaire, jamais un essai négatif', () => {
    expect(iso(computeTrialEndsAt(d('2026-09-01'), -5))).toBe('2026-09-01');
    expect(iso(computeTrialEndsAt(d('2026-09-01'), 14.9))).toBe('2026-09-15');
  });
});
