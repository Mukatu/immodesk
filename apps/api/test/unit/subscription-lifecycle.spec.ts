import {
  canRequestCancellation,
  isBillable,
  isReadOnlyForNonOwner,
  shouldExpireTrial,
  shouldFinalizeCancellation,
  shouldMarkPastDue,
  shouldSuspend,
  statusAfterPaymentConfirmed,
  type SubscriptionStatus,
} from '../../src/modules/subscriptions/domain/subscription-lifecycle';

/**
 * Machine à états d'un abonnement (contrat phase 10, § « Cycle de vie »).
 * Domaine pur : toutes les dates sont des littéraux ISO explicites, jamais
 * dérivées de `new Date()` — piège déjà rencontré sur ce projet (CI rouge).
 */
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe('isBillable — statuts pour lesquels une facture périodique reste due', () => {
  it.each<[SubscriptionStatus, boolean]>([
    ['TRIALING', true],
    ['ACTIVE', true],
    ['PAST_DUE', true],
    ['SUSPENDED', false],
    ['CANCELLED', false],
    ['EXPIRED', false],
  ])('%s → %s', (status, expected) => {
    expect(isBillable(status)).toBe(expected);
  });
});

describe('canRequestCancellation — une résiliation déjà actée ne se redemande pas', () => {
  it('refuse uniquement CANCELLED', () => {
    expect(canRequestCancellation('CANCELLED')).toBe(false);
    expect(canRequestCancellation('ACTIVE')).toBe(true);
    expect(canRequestCancellation('SUSPENDED')).toBe(true);
    expect(canRequestCancellation('EXPIRED')).toBe(true);
  });
});

describe('isReadOnlyForNonOwner — lecture seule uniquement au statut SUSPENDED', () => {
  it.each<[SubscriptionStatus, boolean]>([
    ['TRIALING', false],
    ['ACTIVE', false],
    ['PAST_DUE', false],
    ['SUSPENDED', true],
    ['CANCELLED', false],
    ['EXPIRED', false],
  ])('%s → %s', (status, expected) => {
    expect(isReadOnlyForNonOwner(status)).toBe(expected);
  });
});

describe('shouldExpireTrial — TRIALING → EXPIRED', () => {
  it('vrai le jour même où l’essai s’achève, jamais payé', () => {
    expect(shouldExpireTrial('TRIALING', d('2026-09-20'), d('2026-09-20'))).toBe(true);
  });

  it('vrai après la date de fin d’essai', () => {
    expect(shouldExpireTrial('TRIALING', d('2026-09-20'), d('2026-09-25'))).toBe(true);
  });

  it('faux avant la date de fin d’essai', () => {
    expect(shouldExpireTrial('TRIALING', d('2026-09-20'), d('2026-09-19'))).toBe(false);
  });

  it('faux hors TRIALING, même essai échu (déjà payé ou déjà résilié)', () => {
    expect(shouldExpireTrial('ACTIVE', d('2026-09-20'), d('2026-09-25'))).toBe(false);
    expect(shouldExpireTrial('CANCELLED', d('2026-09-20'), d('2026-09-25'))).toBe(false);
  });

  it('faux sans date de fin d’essai (plan sans essai déjà consommé ailleurs)', () => {
    expect(shouldExpireTrial('TRIALING', null, d('2026-09-25'))).toBe(false);
  });
});

describe('statusAfterPaymentConfirmed — statut atteint après un encaissement confirmé', () => {
  it('bascule TRIALING et PAST_DUE vers ACTIVE', () => {
    expect(statusAfterPaymentConfirmed('TRIALING')).toBe('ACTIVE');
    expect(statusAfterPaymentConfirmed('PAST_DUE')).toBe('ACTIVE');
    expect(statusAfterPaymentConfirmed('SUSPENDED')).toBe('ACTIVE');
  });

  it('un abonnement CANCELLED ou EXPIRED ne repart jamais vers ACTIVE', () => {
    expect(statusAfterPaymentConfirmed('CANCELLED')).toBe('CANCELLED');
    expect(statusAfterPaymentConfirmed('EXPIRED')).toBe('EXPIRED');
  });

  it('ACTIVE reste ACTIVE (idempotent)', () => {
    expect(statusAfterPaymentConfirmed('ACTIVE')).toBe('ACTIVE');
  });
});

describe('shouldMarkPastDue — ACTIVE → PAST_DUE', () => {
  it('vrai uniquement depuis ACTIVE', () => {
    expect(shouldMarkPastDue('ACTIVE')).toBe(true);
  });

  it('faux pour tout autre statut, y compris déjà PAST_DUE (idempotence)', () => {
    expect(shouldMarkPastDue('PAST_DUE')).toBe(false);
    expect(shouldMarkPastDue('TRIALING')).toBe(false);
    expect(shouldMarkPastDue('SUSPENDED')).toBe(false);
    expect(shouldMarkPastDue('CANCELLED')).toBe(false);
  });
});

describe('shouldSuspend — PAST_DUE → SUSPENDED au-delà de grace_days', () => {
  it('faux avant l’échéance du délai de grâce', () => {
    // due_date 2026-09-01, grace_days 7 → échéance 2026-09-08.
    expect(shouldSuspend('PAST_DUE', d('2026-09-01'), 7, d('2026-09-07'))).toBe(false);
  });

  it('vrai exactement le jour de l’échéance du délai de grâce', () => {
    expect(shouldSuspend('PAST_DUE', d('2026-09-01'), 7, d('2026-09-08'))).toBe(true);
  });

  it('vrai au-delà de l’échéance du délai de grâce', () => {
    expect(shouldSuspend('PAST_DUE', d('2026-09-01'), 7, d('2026-09-15'))).toBe(true);
  });

  it('un délai de grâce de zéro jour suspend dès l’échéance elle-même', () => {
    expect(shouldSuspend('PAST_DUE', d('2026-09-01'), 0, d('2026-09-01'))).toBe(true);
    expect(shouldSuspend('PAST_DUE', d('2026-09-01'), 0, d('2026-08-31'))).toBe(false);
  });

  it('faux hors PAST_DUE, même délai de grâce dépassé', () => {
    expect(shouldSuspend('ACTIVE', d('2026-09-01'), 7, d('2026-09-15'))).toBe(false);
    expect(shouldSuspend('SUSPENDED', d('2026-09-01'), 7, d('2026-09-15'))).toBe(false);
  });

  it('faux sans facture impayée connue', () => {
    expect(shouldSuspend('PAST_DUE', null, 7, d('2026-09-15'))).toBe(false);
  });
});

describe('shouldFinalizeCancellation — résiliation demandée, finalisée SEULEMENT en fin de période', () => {
  it('faux tant que la période courante n’est pas achevée (jamais immédiat)', () => {
    expect(
      shouldFinalizeCancellation('ACTIVE', d('2026-09-10'), d('2026-09-30'), d('2026-09-15')),
    ).toBe(false);
  });

  it('vrai le jour même de la fin de la période courante', () => {
    expect(
      shouldFinalizeCancellation('ACTIVE', d('2026-09-10'), d('2026-09-30'), d('2026-09-30')),
    ).toBe(true);
  });

  it('vrai après la fin de la période courante', () => {
    expect(
      shouldFinalizeCancellation('PAST_DUE', d('2026-09-10'), d('2026-09-30'), d('2026-10-05')),
    ).toBe(true);
  });

  it('faux sans demande de résiliation (`cancelled_at` nul)', () => {
    expect(shouldFinalizeCancellation('ACTIVE', null, d('2026-09-30'), d('2026-10-05'))).toBe(
      false,
    );
  });

  it('faux si déjà CANCELLED (idempotence)', () => {
    expect(
      shouldFinalizeCancellation('CANCELLED', d('2026-09-10'), d('2026-09-30'), d('2026-10-05')),
    ).toBe(false);
  });
});
