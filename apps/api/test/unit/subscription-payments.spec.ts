import { SubscriptionPaymentsService } from '../../src/modules/subscriptions/application/subscription-payments.service';

/**
 * Tests unitaires purs (aucun accès base) de `SubscriptionPaymentsService`
 * (contrat phase 10, route `POST /v1/subscription-invoices/{id}/pay` et
 * re-interrogation `verifyStatus`, arbitrage 8 : le webhook ne confirme
 * jamais seul). Toutes les dates sont des littéraux ISO explicites.
 *
 * Même convention de faux `PrismaService` que
 * `test/unit/referral-qualification.spec.ts` : `withTenant(org, user, fn)`
 * exécute directement `fn(tx)` sur un client partagé.
 */

function fakeTx(overrides: Record<string, unknown> = {}) {
  const base = {
    subscription_invoices: { findFirst: jest.fn(), update: jest.fn() },
    subscriptions: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
    mobile_money_transactions: { create: jest.fn(), update: jest.fn() },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
  };
  return { ...base, ...overrides };
}

function buildService(
  tx: ReturnType<typeof fakeTx>,
  providerOverrides: Record<string, unknown> = {},
) {
  const prisma = {
    withTenant: jest.fn((_org: string, _user: string | null, fn: (tx: unknown) => unknown) =>
      fn(tx),
    ),
  };
  const config = { get: jest.fn().mockReturnValue('SIMULATOR') };
  const auditService = { record: jest.fn() };
  const provider = {
    code: 'SIMULATOR',
    initiate: jest.fn(),
    getStatus: jest.fn(),
    ...providerOverrides,
  };
  const registry = { forCode: jest.fn().mockReturnValue(provider) };
  const verifyQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const numbering = { nextNumber: jest.fn().mockResolvedValue({ number: 'MOMO-202609-00001' }) };
  const referralQualification = {
    onSubscriptionInvoicePaid: jest.fn().mockResolvedValue(undefined),
  };
  const service = new SubscriptionPaymentsService(
    prisma as never,
    config as never,
    auditService as never,
    registry as never,
    verifyQueue as never,
    numbering as never,
    referralQualification as never,
  );
  return {
    service,
    prisma,
    config,
    auditService,
    provider,
    registry,
    verifyQueue,
    numbering,
    referralQualification,
  };
}

describe('SubscriptionPaymentsService.pay — garde-fous (transitions interdites)', () => {
  it('SUBSCRIPTIONS.INVOICE_NOT_FOUND si la facture est introuvable dans le périmètre de l’organisation', async () => {
    const tx = fakeTx({
      subscription_invoices: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() },
    });
    const { service } = buildService(tx);
    await expect(service.pay('org-1', 'user-1', 'inv-1')).rejects.toMatchObject({
      code: 'SUBSCRIPTIONS.INVOICE_NOT_FOUND',
    });
  });

  it.each(['PAID', 'CANCELLED'])(
    'SUBSCRIPTIONS.ALREADY_PAID si la facture est déjà %s (seuls ISSUED/OVERDUE se règlent)',
    async (status) => {
      const tx = fakeTx({
        subscription_invoices: {
          findFirst: jest.fn().mockResolvedValue({ id: 'inv-1', status, total_amount: 10_000n }),
          update: jest.fn(),
        },
      });
      const { service } = buildService(tx);
      await expect(service.pay('org-1', 'user-1', 'inv-1')).rejects.toMatchObject({
        code: 'SUBSCRIPTIONS.ALREADY_PAID',
      });
    },
  );

  it.each(['ISSUED', 'OVERDUE'])('accepte le règlement d’une facture %s', async (status) => {
    const tx = fakeTx({
      subscription_invoices: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          status,
          total_amount: 10_000n,
          subscription_id: 'sub-1',
        }),
        update: jest.fn(),
      },
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1', momo_msisdn: '+242066000001' }),
        update: jest.fn(),
      },
    });
    const { service, provider } = buildService(tx);
    (provider.initiate as jest.Mock).mockResolvedValue({
      providerReference: 'ref-1',
      state: 'PENDING',
      rawPayload: {},
    });
    const result = await service.pay('org-1', 'user-1', 'inv-1');
    expect(result.status).toBe('PENDING');
  });

  it('VALIDATION.INVALID_PAYLOAD sans numéro Mobile Money (ni saisi, ni enregistré sur l’abonnement)', async () => {
    const tx = fakeTx({
      subscription_invoices: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          status: 'ISSUED',
          total_amount: 10_000n,
          subscription_id: 'sub-1',
        }),
        update: jest.fn(),
      },
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1', momo_msisdn: null }),
        update: jest.fn(),
      },
    });
    const { service } = buildService(tx);
    await expect(service.pay('org-1', 'user-1', 'inv-1')).rejects.toMatchObject({
      code: 'VALIDATION.INVALID_PAYLOAD',
    });
  });

  it('MOMO.OPERATOR_UNKNOWN pour un numéro valide mais hors préfixes MTN/Airtel Congo', async () => {
    const tx = fakeTx({
      subscription_invoices: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          status: 'ISSUED',
          total_amount: 10_000n,
          subscription_id: 'sub-1',
        }),
        update: jest.fn(),
      },
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1', momo_msisdn: '+242010000000' }),
        update: jest.fn(),
      },
    });
    const { service } = buildService(tx);
    await expect(service.pay('org-1', 'user-1', 'inv-1')).rejects.toMatchObject({
      code: 'MOMO.OPERATOR_UNKNOWN',
    });
  });
});

describe('SubscriptionPaymentsService.verifyStatus — re-interrogation, jamais le webhook seul (arbitrage 8)', () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'txn-1',
    organization_id: 'org-1',
    status: 'PENDING',
    aggregator: 'SIMULATOR',
    aggregator_transaction_id: 'ref-1',
    merchant_reference: 'MOMO-202609-00001',
    amount: 10_000n,
    ...overrides,
  });

  it('idempotent : ne fait rien si la transaction est introuvable ou déjà finalisée', async () => {
    const tx = fakeTx({
      $queryRawUnsafe: jest.fn().mockResolvedValue([row({ status: 'SUCCEEDED' })]),
    });
    const { service, provider, referralQualification } = buildService(tx);
    await service.verifyStatus('org-1', 'txn-1');
    expect(provider.getStatus).not.toHaveBeenCalled();
    expect(referralQualification.onSubscriptionInvoicePaid).not.toHaveBeenCalled();
  });

  it('SUCCEEDED avec montant conforme : facture PAID, ACTIVE via statusAfterPaymentConfirmed, referral notifié APRÈS le commit', async () => {
    const invoice = {
      id: 'inv-1',
      status: 'ISSUED',
      total_amount: 10_000n,
      subtotal_amount: 8_475n,
      subscription_id: 'sub-1',
    };
    const subscription = { id: 'sub-1', status: 'PAST_DUE' };
    const tx = fakeTx({
      $queryRawUnsafe: jest.fn().mockResolvedValue([row()]),
      subscription_invoices: {
        findFirst: jest.fn().mockResolvedValue(invoice),
        update: jest.fn().mockResolvedValue({ ...invoice, status: 'PAID' }),
      },
      subscriptions: {
        findUnique: jest.fn().mockResolvedValue(subscription),
        update: jest.fn(),
      },
      mobile_money_transactions: { create: jest.fn(), update: jest.fn() },
    });
    const { service, provider, referralQualification } = buildService(tx);
    (provider.getStatus as jest.Mock).mockResolvedValue({ state: 'SUCCEEDED', amount: 10_000n });

    await service.verifyStatus('org-1', 'txn-1');

    expect(tx.subscription_invoices.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ status: 'PAID', paid_amount: 10_000n }),
      }),
    );
    expect(tx.subscriptions.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'ACTIVE', suspended_at: null }),
      }),
    );
    // Assiette hors taxe (`subtotal_amount`), jamais `total_amount` qui inclut
    // la TVA — voir la docstring de `ReferralQualificationService`.
    expect(referralQualification.onSubscriptionInvoicePaid).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'inv-1',
        organizationId: 'org-1',
        subtotalAmount: 8_475n,
      }),
    );
  });

  it('SUCCEEDED mais montant désaccordé (SUBSCRIPTIONS.MOMO_STATUS_MISMATCH) : aucune facture confirmée, aucune commission', async () => {
    const tx = fakeTx({
      $queryRawUnsafe: jest.fn().mockResolvedValue([row({ amount: 10_000n })]),
      subscription_invoices: { findFirst: jest.fn(), update: jest.fn() },
    });
    const { service, provider, referralQualification } = buildService(tx);
    (provider.getStatus as jest.Mock).mockResolvedValue({ state: 'SUCCEEDED', amount: 7_000n });

    await service.verifyStatus('org-1', 'txn-1');

    expect(tx.subscription_invoices.update).not.toHaveBeenCalled();
    expect(referralQualification.onSubscriptionInvoicePaid).not.toHaveBeenCalled();
  });

  it('FAILED : marque la transaction FAILED, ne touche à aucune facture ni abonnement', async () => {
    const tx = fakeTx({
      $queryRawUnsafe: jest.fn().mockResolvedValue([row()]),
      subscription_invoices: { findFirst: jest.fn(), update: jest.fn() },
      subscriptions: { findUnique: jest.fn(), update: jest.fn() },
    });
    const { service, provider, referralQualification } = buildService(tx);
    (provider.getStatus as jest.Mock).mockResolvedValue({
      state: 'FAILED',
      failureCode: 'INSUFFICIENT_FUNDS',
      failureMessage: 'Solde insuffisant',
    });

    await service.verifyStatus('org-1', 'txn-1');

    expect(tx.mobile_money_transactions.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-1' },
        data: expect.objectContaining({ status: 'FAILED', failure_code: 'INSUFFICIENT_FUNDS' }),
      }),
    );
    expect(tx.subscription_invoices.update).not.toHaveBeenCalled();
    expect(referralQualification.onSubscriptionInvoicePaid).not.toHaveBeenCalled();
  });

  it('facture déjà PAID entre-temps (course) : ne réécrit rien une seconde fois (idempotence)', async () => {
    const invoice = {
      id: 'inv-1',
      status: 'PAID',
      total_amount: 10_000n,
      subscription_id: 'sub-1',
    };
    const tx = fakeTx({
      $queryRawUnsafe: jest.fn().mockResolvedValue([row()]),
      subscription_invoices: { findFirst: jest.fn().mockResolvedValue(invoice), update: jest.fn() },
    });
    const { service, provider, referralQualification } = buildService(tx);
    (provider.getStatus as jest.Mock).mockResolvedValue({ state: 'SUCCEEDED', amount: 10_000n });

    await service.verifyStatus('org-1', 'txn-1');

    expect(tx.subscription_invoices.update).not.toHaveBeenCalled();
    expect(referralQualification.onSubscriptionInvoicePaid).not.toHaveBeenCalled();
  });

  it('PENDING/UNKNOWN chez le fournisseur : aucune décision, une prochaine re-interrogation tranchera', async () => {
    const tx = fakeTx({
      $queryRawUnsafe: jest.fn().mockResolvedValue([row()]),
      subscription_invoices: { findFirst: jest.fn(), update: jest.fn() },
    });
    const { service, provider, referralQualification } = buildService(tx);
    (provider.getStatus as jest.Mock).mockResolvedValue({ state: 'PENDING' });

    await service.verifyStatus('org-1', 'txn-1');

    expect(tx.subscription_invoices.update).not.toHaveBeenCalled();
    expect(referralQualification.onSubscriptionInvoicePaid).not.toHaveBeenCalled();
  });
});
