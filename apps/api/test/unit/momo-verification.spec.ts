import { Logger } from '@nestjs/common';
import { MomoPayoutService } from '../../src/modules/mobile-money/application/momo-payout.service';
import { MomoStatusChecker } from '../../src/modules/mobile-money/application/momo-status-checker';
import { MomoVerificationService } from '../../src/modules/mobile-money/application/momo-verification.service';
import {
  providerConfirmsAmount,
  providerReferenceOf,
} from '../../src/modules/mobile-money/domain/momo-rules';

/**
 * Tests unitaires purs de l'intégrité de la vérification Mobile Money :
 * aucune réponse mémorisée, montant ET devise exigés, jamais la
 * `merchant_reference` comme clé fournisseur.
 */

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'txn-1',
  channel: 'AGGREGATOR',
  status: 'PENDING',
  aggregator: 'SIMULATOR',
  aggregator_transaction_id: 'ref-1',
  external_reference: 'txn-1',
  purpose: 'RENT_COLLECTION',
  merchant_reference: 'MOMO-202609-00001',
  payment_id: 'pay-1',
  invoice_id: 'inv-1',
  amount: 10_000n,
  currency: 'XAF',
  fee_bearer: 'TENANT',
  ...overrides,
});

/** Vérificateur réel dont la réservation (accès base) est neutralisée. */
function checkerStub(): MomoStatusChecker {
  const checker = new MomoStatusChecker(
    { get: () => 1000 } as never,
    {} as never,
    {} as never,
    {} as never,
  );
  jest.spyOn(checker, 'claim').mockResolvedValue(true);
  jest.spyOn(checker, 'claimTriggerEvents').mockResolvedValue(undefined);
  return checker;
}

function buildVerification(
  rows: Array<Record<string, unknown>>,
  getStatus: jest.Mock,
  providerExtra: Record<string, unknown> = {},
) {
  const tx = {
    mobile_money_transactions: {
      update: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ purpose: rows[0]?.purpose ?? 'RENT_COLLECTION' }),
    },
    payments: { update: jest.fn() },
  };
  const prisma = {
    withTenant: jest.fn((_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tx)),
  };
  // Le verrou relit l'état courant : chaque appel consomme la ligne suivante.
  const queries = {
    lock: jest.fn(() => Promise.resolve(rows.length > 1 ? rows.shift() : rows[0])),
  };
  const registry = { forCode: jest.fn().mockReturnValue({ getStatus, ...providerExtra }) };
  const paymentsQueries = {
    lock: jest.fn().mockResolvedValue({ id: 'pay-1', organization_id: 'o' }),
  };
  const allocation = { allocate: jest.fn().mockResolvedValue({ paidInvoiceIds: [] }) };
  const auditService = { record: jest.fn() };
  const payouts = { verifyPayout: jest.fn() };
  const service = new MomoVerificationService(
    prisma as never,
    queries as never,
    registry as never,
    paymentsQueries as never,
    allocation as never,
    payouts as never,
    checkerStub() as never,
    { requeueThrottled: jest.fn() } as never,
    auditService as never,
  );
  return { service, tx, allocation, getStatus, payouts };
}

const statusUpdates = (tx: ReturnType<typeof buildVerification>['tx']) =>
  tx.mobile_money_transactions.update.mock.calls
    .map(([arg]) => (arg as { data: { status?: string } }).data.status)
    .filter(Boolean);

describe('MomoVerificationService.verifyStatus', () => {
  it('1re vérification PENDING puis 2e SUCCEEDED : la transaction devient SUCCEEDED', async () => {
    const getStatus = jest
      .fn()
      .mockResolvedValueOnce({ state: 'PENDING', providerReference: 'ref-1', rawPayload: null })
      .mockResolvedValueOnce({
        state: 'SUCCEEDED',
        providerReference: 'ref-1',
        amount: 10_000n,
        currency: 'XAF',
        feeAmount: 0n,
        rawPayload: null,
      });
    const { service, tx, allocation } = buildVerification([baseRow()], getStatus);
    await service.verifyStatus('org-1', 'txn-1');
    expect(statusUpdates(tx)).toEqual([]);
    await service.verifyStatus('org-1', 'txn-1');
    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(statusUpdates(tx)).toEqual(['SUCCEEDED']);
    expect(allocation.allocate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['devise absente', { amount: 10_000n }],
    ['montant absent', { currency: 'XAF' }],
    ['devise divergente', { amount: 10_000n, currency: 'EUR' }],
    ['montant divergent', { amount: 9_999n, currency: 'XAF' }],
  ])('SUCCEEDED avec %s : non confirmé, paiement PENDING_VERIFICATION', async (_l, extra) => {
    const getStatus = jest.fn().mockResolvedValue({
      state: 'SUCCEEDED',
      providerReference: 'ref-1',
      rawPayload: null,
      ...extra,
    });
    const { service, tx, allocation } = buildVerification([baseRow()], getStatus);
    await service.verifyStatus('org-1', 'txn-1');
    expect(statusUpdates(tx)).toEqual([]);
    expect(allocation.allocate).not.toHaveBeenCalled();
    expect(tx.payments.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { status: 'PENDING_VERIFICATION' },
    });
  });

  it('ligne AGGREGATOR sans external_reference : fournisseur non interrogé', async () => {
    const getStatus = jest.fn();
    const row = baseRow({ external_reference: null, aggregator_transaction_id: 'MOMO-1' });
    const { service, tx } = buildVerification([row], getStatus);
    await service.verifyStatus('org-1', 'txn-1');
    expect(getStatus).not.toHaveBeenCalled();
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
  });
});

describe('providerConfirmsAmount / providerReferenceOf', () => {
  const expected = { amount: 100n, currency: 'XAF' };
  it('exige montant et devise égaux', () => {
    expect(providerConfirmsAmount({ amount: 100n, currency: 'XAF' }, expected)).toBe(true);
    expect(providerConfirmsAmount({ amount: 100n }, expected)).toBe(false);
    expect(providerConfirmsAmount({ currency: 'XAF' }, expected)).toBe(false);
    expect(providerConfirmsAmount({ amount: 100n, currency: 'USD' }, expected)).toBe(false);
  });
  it('ne se rabat jamais sur la merchant_reference', () => {
    expect(providerReferenceOf({ aggregator_transaction_id: 'A', external_reference: 'E' })).toBe(
      'A',
    );
    expect(providerReferenceOf({ aggregator_transaction_id: null, external_reference: 'E' })).toBe(
      'E',
    );
    expect(
      providerReferenceOf({ aggregator_transaction_id: 'OLD', external_reference: null }),
    ).toBeNull();
  });
});

describe('MomoPayoutService.refreshPayoutStatus', () => {
  const build = (status: Record<string, unknown>, rowOverrides: Record<string, unknown> = {}) => {
    const tx = {
      $queryRawUnsafe: jest.fn(),
      mobile_money_transactions: {
        findFirst: jest.fn().mockResolvedValue({
          status: 'PENDING',
          purpose: 'OWNER_PAYOUT',
          direction: 'OUTBOUND',
          payer_msisdn: '+242066203420',
          amount: 50_000n,
          currency: 'XAF',
          aggregator: 'SIMULATOR',
          aggregator_transaction_id: 'ref-1',
          external_reference: 'txn-1',
          merchant_reference: 'REV-202609-00001',
          ...rowOverrides,
        }),
        update: jest.fn(),
      },
    };
    const getStatus = jest
      .fn()
      .mockResolvedValue({ providerReference: 'ref-1', rawPayload: null, ...status });
    const service = new MomoPayoutService(
      { forCode: () => ({ getStatus }) } as never,
      { get: () => 'http://localhost:3000' } as never,
      checkerStub(),
      {} as never,
      { enqueue: jest.fn().mockResolvedValue(undefined) } as never,
    );
    return { service, tx, getStatus };
  };
  const statusWrites = (tx: ReturnType<typeof build>['tx']) =>
    tx.mobile_money_transactions.update.mock.calls
      .map(([arg]) => (arg as { data: { status?: string } }).data.status)
      .filter(Boolean);

  it('SUCCEEDED conforme : persisté SUCCEEDED', async () => {
    const { service, tx } = build({ state: 'SUCCEEDED', amount: 50_000n, currency: 'XAF' });
    const result = await service.refreshPayoutStatus(tx as never, 'txn-1');
    expect(result.state).toBe('SUCCEEDED');
    expect(statusWrites(tx)).toEqual(['SUCCEEDED']);
  });

  it('UNKNOWN : aucune écriture de statut (jamais de retour en PENDING)', async () => {
    const { service, tx } = build({ state: 'UNKNOWN' }, { status: 'SUCCEEDED' });
    expect((await service.refreshPayoutStatus(tx as never, 'txn-1')).state).toBe('SUCCEEDED');
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
    const pending = build({ state: 'UNKNOWN' });
    expect((await pending.service.refreshPayoutStatus(pending.tx as never, 'txn-1')).state).toBe(
      'PENDING',
    );
    expect(statusWrites(pending.tx)).toEqual([]);
  });

  it('ligne déjà terminale (FAILED) : jamais réécrite, fournisseur non interrogé', async () => {
    const { service, tx, getStatus } = build({ state: 'PENDING' }, { status: 'FAILED' });
    expect((await service.refreshPayoutStatus(tx as never, 'txn-1')).state).toBe('FAILED');
    expect(getStatus).not.toHaveBeenCalled();
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
  });

  it.each([
    ['montant divergent', { amount: 40_000n, currency: 'XAF' }],
    ['devise absente', { amount: 50_000n }],
    ['montant absent', { currency: 'XAF' }],
  ])('SUCCEEDED avec %s : le décaissement reste PENDING', async (_l, extra) => {
    const { service, tx } = build({ state: 'SUCCEEDED', ...extra });
    const result = await service.refreshPayoutStatus(tx as never, 'txn-1');
    expect(result.state).toBe('PENDING');
    expect(statusWrites(tx)).toEqual([]);
  });

  it('sans external_reference : erreur, fournisseur non interrogé', async () => {
    const { service, tx, getStatus } = build({ state: 'SUCCEEDED' }, { external_reference: null });
    await expect(service.refreshPayoutStatus(tx as never, 'txn-1')).rejects.toMatchObject({
      code: 'MOMO.PROVIDER_UNAVAILABLE',
    });
    expect(getStatus).not.toHaveBeenCalled();
  });
});

describe('MomoVerificationService : garde-fous par purpose', () => {
  it('ligne SUBSCRIPTION : ni getStatus ni écriture', async () => {
    const getStatus = jest.fn();
    const { service, tx } = buildVerification([baseRow({ purpose: 'SUBSCRIPTION' })], getStatus);
    await service.verifyStatus('org-1', 'txn-1');
    expect(getStatus).not.toHaveBeenCalled();
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
  });

  it('ligne OWNER_PAYOUT : déléguée au décaissement', async () => {
    const getStatus = jest.fn();
    const { service, payouts } = buildVerification(
      [baseRow({ purpose: 'OWNER_PAYOUT' })],
      getStatus,
    );
    await service.verifyStatus('org-1', 'txn-1');
    expect(payouts.verifyPayout).toHaveBeenCalledTimes(1);
    expect(getStatus).not.toHaveBeenCalled();
  });
});

describe('MomoVerificationService : transitions contrôlées et succès tardif (F9, M1)', () => {
  const succeeded = {
    state: 'SUCCEEDED',
    providerReference: 'PTXN1234ABCD',
    amount: 10_000n,
    currency: 'XAF',
    matched: true,
    rawPayload: null,
  };

  it('INITIATED (callback avant la réponse d’initiation) -> SUCCEEDED : transition explicite et valide', async () => {
    const getStatus = jest.fn().mockResolvedValue(succeeded);
    const { service, tx } = buildVerification([baseRow({ status: 'INITIATED' })], getStatus);
    await service.verifyStatus('org-1', 'txn-1');
    expect(statusUpdates(tx)).toEqual(['SUCCEEDED']);
  });

  it('callback sur une transaction EXPIRED : succès conforme signalé en erreur, AUCUNE écriture', async () => {
    const getStatus = jest.fn().mockResolvedValue(succeeded);
    const errors: string[] = [];
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => {
      errors.push(String(m));
    });
    const { service, tx, allocation } = buildVerification(
      [baseRow({ status: 'EXPIRED' })],
      getStatus,
      { webhookTrust: 'UNSIGNED_TRIGGER' },
    );
    await service.verifyStatus('org-1', 'txn-1', { origin: 'CALLBACK' });
    spy.mockRestore();
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(errors.join(' ')).toContain('MOMO.LATE_SUCCESS_ON_EXPIRED');
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
    expect(tx.payments.update).not.toHaveBeenCalled();
    expect(allocation.allocate).not.toHaveBeenCalled();
  });

  it('transaction EXPIRED et réponse non conforme : ni alerte ni écriture', async () => {
    const getStatus = jest.fn().mockResolvedValue({ ...succeeded, amount: 1n });
    const errors: string[] = [];
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation((m: unknown) => {
      errors.push(String(m));
    });
    const { service, tx } = buildVerification([baseRow({ status: 'EXPIRED' })], getStatus, {
      webhookTrust: 'UNSIGNED_TRIGGER',
    });
    await service.verifyStatus('org-1', 'txn-1');
    spy.mockRestore();
    expect(errors).toEqual([]);
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
  });
});
