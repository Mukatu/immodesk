import { SubscriptionBillingRunService } from '../../src/modules/subscriptions/application/subscription-billing-run.service';
import {
  computePeriodEnd,
  nextPeriodStart,
} from '../../src/modules/subscriptions/domain/subscription-billing-cycle';
import { formatXaf } from '../../src/shared/money/amount';
import { frenchLongDate } from '../../src/modules/billing/domain/period-label';
import { MESSAGE_TEMPLATE_CODES } from '../../src/modules/notifications/domain/template-codes';

/**
 * Tests unitaires purs (aucun accès base) de `SubscriptionBillingRunService`
 * (contrat phase 10, § « Cycle de vie », « Suspension » et « Avertissement
 * préalable »). Toutes les dates sont des littéraux ISO explicites, jamais
 * `new Date()` implicite.
 *
 * `PrismaService.withTenant` est simulé par une fonction qui exécute
 * directement `fn(tx)` sur un faux client partagé : les assertions portent
 * sur les appels Prisma (mêmes conventions que
 * `test/unit/referral-qualification.spec.ts`).
 */
const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

function fakeTx(overrides: Record<string, unknown> = {}) {
  const base = {
    subscriptions: { findUnique: jest.fn(), update: jest.fn() },
    subscription_invoices: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    units: { count: jest.fn().mockResolvedValue(0) },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };
  return { ...base, ...overrides };
}

function buildService(
  tx: ReturnType<typeof fakeTx>,
  candidates: Array<{ id: string; organization_id: string }>,
  enqueuer: { enqueue: jest.Mock } | null = {
    enqueue: jest.fn().mockResolvedValue({ notificationId: 'n1', created: true }),
  },
) {
  const prisma = {
    withTenant: jest.fn((_org: string, _user: string | null, fn: (tx: unknown) => unknown) =>
      fn(tx),
    ),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'DATABASE_ADMIN_URL'
        ? 'postgres://admin'
        : key === 'PUBLIC_WEB_BASE_URL'
          ? 'https://app.immodesk.cg'
          : undefined,
    ),
  };
  const numbering = { nextNumber: jest.fn().mockResolvedValue({ number: 'ABO-202609-00001' }) };
  const auditService = { record: jest.fn() };
  const plans = {
    requireById: jest.fn().mockResolvedValue({
      base_price_amount: 10_000n,
      price_per_unit_amount: 500n,
      included_units: 5,
    }),
  };
  const service = new SubscriptionBillingRunService(
    prisma as never,
    config as never,
    numbering as never,
    auditService as never,
    plans as never,
    enqueuer as never,
  );
  (service as unknown as { admin: unknown }).admin = {
    $queryRawUnsafe: jest.fn().mockResolvedValue(candidates),
  };
  return { service, prisma, config, numbering, auditService, plans, enqueuer };
}

const OWNER_ROW = {
  phone: '+242066000001',
  first_name: 'Jean',
  last_name: 'Mabiala',
  display_name: null,
  organization_name: 'Agence Test',
};

describe('SubscriptionBillingRunService — ACTIVE → PAST_DUE : avertissement préalable', () => {
  it('marque la facture OVERDUE, transitionne PAST_DUE et envoie l’avertissement WhatsApp+SMS au OWNER, AVANT toute suspension', async () => {
    const subscription = {
      id: 'sub-1',
      status: 'ACTIVE',
      trial_ends_at: null,
      next_billing_date: null, // aucune facture à émettre ce jour
      billing_interval: 'MONTHLY',
      grace_days: 7,
      cancelled_at: null,
      current_period_end: d('2026-12-31'),
      plan_id: 'plan-1',
      organization_id: 'org-1',
      discount_rate_bps: 0,
    };
    const overdueInvoice = { id: 'inv-1', due_date: d('2026-09-10'), total_amount: 15_000n };
    const tx = fakeTx({
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue(subscription),
        update: jest.fn(({ data }) => Promise.resolve({ ...subscription, ...data })),
      },
      subscription_invoices: {
        findMany: jest.fn().mockResolvedValue([overdueInvoice]),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ ...overdueInvoice, status: 'OVERDUE' }),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      units: { count: jest.fn() },
      $queryRawUnsafe: jest.fn().mockResolvedValue([OWNER_ROW]),
    });
    const { service, enqueuer } = buildService(tx, [{ id: 'sub-1', organization_id: 'org-1' }]);

    // Échéance 2026-09-10 + 7 jours de grâce = 2026-09-17 : today (12) est
    // AVANT cette échéance, donc pas de SUSPENDED ce jour-là — seulement le
    // passage PAST_DUE et son avertissement.
    await service.runDaily(d('2026-09-12'));

    expect(tx.subscription_invoices.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'OVERDUE' },
    });
    expect(tx.subscriptions.update).toHaveBeenCalledTimes(1);
    expect(tx.subscriptions.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAST_DUE' }) }),
    );

    expect(enqueuer!.enqueue).toHaveBeenCalledTimes(1);
    expect(enqueuer!.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        templateCode: MESSAGE_TEMPLATE_CODES.SUBSCRIPTION_PAST_DUE_WARNING,
        channelOrder: ['WHATSAPP', 'SMS'],
        recipient: expect.objectContaining({ phone: '+242066000001', name: 'Jean Mabiala' }),
        variables: expect.objectContaining({
          organizationName: 'Agence Test',
          amount: formatXaf(15_000n),
          deadline: frenchLongDate(d('2026-09-17')), // due_date + grace_days
        }),
        relatedEntity: { type: 'subscriptions', id: 'sub-1' },
        dedupeKey: 'subscription-past-due-warning:inv-1',
      }),
    );
  });

  it('sans pipeline de notification branché (@Optional), la transition reste actée sans planter', async () => {
    const subscription = {
      id: 'sub-1',
      status: 'ACTIVE',
      trial_ends_at: null,
      next_billing_date: null,
      billing_interval: 'MONTHLY',
      grace_days: 7,
      cancelled_at: null,
      current_period_end: d('2026-12-31'),
      plan_id: 'plan-1',
      organization_id: 'org-1',
      discount_rate_bps: 0,
    };
    const overdueInvoice = { id: 'inv-1', due_date: d('2026-09-10'), total_amount: 15_000n };
    const tx = fakeTx({
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue(subscription),
        update: jest.fn(({ data }) => Promise.resolve({ ...subscription, ...data })),
      },
      subscription_invoices: {
        findMany: jest.fn().mockResolvedValue([overdueInvoice]),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ ...overdueInvoice, status: 'OVERDUE' }),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      units: { count: jest.fn() },
    });
    const { service } = buildService(tx, [{ id: 'sub-1', organization_id: 'org-1' }], null);

    const result = await service.runDaily(d('2026-09-12'));

    expect(result.processed).toBe(1);
    expect(tx.subscriptions.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAST_DUE' }) }),
    );
  });
});

describe('SubscriptionBillingRunService — PAST_DUE → SUSPENDED : jamais un second avertissement', () => {
  it('suspend au-delà du délai de grâce SANS ré-émettre l’avertissement (déjà envoyé au passage PAST_DUE)', async () => {
    const subscription = {
      id: 'sub-1',
      status: 'PAST_DUE',
      trial_ends_at: null,
      next_billing_date: null,
      billing_interval: 'MONTHLY',
      grace_days: 7,
      cancelled_at: null,
      current_period_end: d('2026-12-31'),
      plan_id: 'plan-1',
      organization_id: 'org-1',
      discount_rate_bps: 0,
    };
    const unpaidInvoice = { id: 'inv-1', due_date: d('2026-09-01'), status: 'OVERDUE' };
    const tx = fakeTx({
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue(subscription),
        update: jest.fn(({ data }) => Promise.resolve({ ...subscription, ...data })),
      },
      subscription_invoices: {
        findMany: jest.fn().mockResolvedValue([]), // déjà marquée OVERDUE lors du run précédent
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(unpaidInvoice),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      units: { count: jest.fn() },
    });
    // Échéance 2026-09-01 + 7 jours = 2026-09-08 : today (15) est BIEN
    // au-delà, donc suspension.
    const { service, enqueuer } = buildService(tx, [{ id: 'sub-1', organization_id: 'org-1' }]);

    await service.runDaily(d('2026-09-15'));

    expect(tx.subscriptions.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUSPENDED', suspended_at: d('2026-09-15') }),
      }),
    );
    expect(enqueuer!.enqueue).not.toHaveBeenCalled();
  });
});

describe('SubscriptionBillingRunService — idempotence de la campagne de facturation', () => {
  it('n’émet aucune seconde facture le même jour une fois `next_billing_date` avancé (garde applicative, en plus de la contrainte unique en base)', async () => {
    const periodStart = d('2026-09-01');
    const interval = 'MONTHLY' as const;
    const periodEnd = computePeriodEnd(periodStart, interval);
    const advancedNextBillingDate = nextPeriodStart(periodEnd);
    const today = d('2026-09-01');

    const initial = {
      id: 'sub-1',
      status: 'ACTIVE',
      trial_ends_at: null,
      next_billing_date: periodStart,
      billing_interval: interval,
      grace_days: 7,
      cancelled_at: null,
      current_period_end: periodEnd,
      plan_id: 'plan-1',
      organization_id: 'org-1',
      discount_rate_bps: 0,
    };
    const afterFirstRun = { ...initial, next_billing_date: advancedNextBillingDate };

    const tx = fakeTx({
      subscriptions: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(initial) // premier passage du cron
          .mockResolvedValueOnce(afterFirstRun), // second passage, même jour
        update: jest.fn(({ data }) => Promise.resolve({ ...initial, ...data })),
      },
      subscription_invoices: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null), // aucune facture déjà émise
        create: jest.fn().mockResolvedValue(undefined),
      },
      units: { count: jest.fn().mockResolvedValue(3) },
    });
    const { service, numbering } = buildService(tx, [{ id: 'sub-1', organization_id: 'org-1' }]);

    await service.runDaily(today);
    await service.runDaily(today); // second passage du même cron, même jour

    // Un seul passage a trouvé `next_billing_date <= today` : la facture
    // n'est émise qu'une fois, la numérotation n'est tirée qu'une fois.
    expect(tx.subscription_invoices.create).toHaveBeenCalledTimes(1);
    expect(numbering.nextNumber).toHaveBeenCalledTimes(1);
  });

  it('une facture déjà émise pour la période (contrainte unique) n’est jamais recréée par `issueSubscriptionInvoice`', async () => {
    const subscription = {
      id: 'sub-1',
      status: 'ACTIVE',
      trial_ends_at: null,
      next_billing_date: d('2026-09-01'),
      billing_interval: 'MONTHLY' as const,
      grace_days: 7,
      cancelled_at: null,
      current_period_end: d('2026-09-30'),
      plan_id: 'plan-1',
      organization_id: 'org-1',
      discount_rate_bps: 0,
    };
    const tx = fakeTx({
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue(subscription),
        update: jest.fn(({ data }) => Promise.resolve({ ...subscription, ...data })),
      },
      subscription_invoices: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        // La facture de cette période existe déjà (arbitrage : UNIQUE(subscription_id, period_start)).
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-inv' }),
        create: jest.fn(),
      },
      units: { count: jest.fn().mockResolvedValue(3) },
    });
    const { service, numbering } = buildService(tx, [{ id: 'sub-1', organization_id: 'org-1' }]);

    await service.runDaily(d('2026-09-01'));

    expect(tx.subscription_invoices.create).not.toHaveBeenCalled();
    expect(numbering.nextNumber).not.toHaveBeenCalled();
    // La reprise de l'abonnement (units_count, montants) reste appliquée :
    // idempotence de la facture, pas gel du recalcul.
    expect(tx.subscriptions.update).toHaveBeenCalled();
  });
});
