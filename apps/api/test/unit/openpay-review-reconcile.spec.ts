import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';

/** Correctifs de la revue PR #62 : expiration des reversements (E3), rejeu idempotent (M1), course d'expiration (M3). */

const T0 = new Date('2026-09-10T08:00:00Z');
const hoursLater = (h: number) => new Date(T0.getTime() + h * 3_600_000);

function build(
  rowOverrides: Record<string, unknown>,
  opts: {
    provider?: Record<string, unknown>;
    statusAfterVerify?: string;
    updateCount?: number;
  } = {},
) {
  const row = {
    id: 'tx-1',
    organization_id: 'org-1',
    status: 'PENDING',
    initiated_at: T0,
    status_checked_at: null,
    status_check_count: 0,
    external_reference: '550e8400-e29b-41d4-a716-446655440000',
    purpose: 'OWNER_PAYOUT',
    aggregator: 'OPENPAY',
    aggregator_transaction_id: '550e8400-e29b-41d4-a716-446655440000',
    payer_msisdn: '+242066203420',
    amount: 50_000n,
    ...rowOverrides,
  };
  const admin = {
    $queryRawUnsafe: jest.fn().mockResolvedValue([row]),
    organization_settings: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const tx = {
    mobile_money_transactions: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'tx-1',
        payment_id: null,
        status: opts.statusAfterVerify ?? row.status,
        purpose: row.purpose,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: opts.updateCount ?? 1 }),
    },
  };
  const prisma = {
    adminClient: () => admin,
    withTenant: (_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tx),
  };
  const verifyNow = jest.fn().mockResolvedValue(undefined);
  const provider = {
    code: 'OPENPAY',
    idempotentInitiation: true,
    initiate: jest.fn().mockResolvedValue({ providerReference: 'PTXN1234ABCD', state: 'PENDING' }),
    cancelPayout: jest.fn().mockResolvedValue('CANCELLED'),
    ...opts.provider,
  };
  const notifyOutcome = jest.fn().mockResolvedValue(undefined);
  const service = new MomoReconcileService(
    prisma as never,
    { handlerFor: () => ({ verifyNow, enqueueVerify: jest.fn() }) } as never,
    { record: jest.fn() } as never,
    {
      get: (k: string) => (k === 'MOMO_INITIATED_EXPIRY_MINUTES' ? 60 : 'http://localhost'),
    } as never,
    { forCode: () => provider } as never,
    { notifyOutcome } as never,
  );
  return { service, tx, verifyNow, provider, notifyOutcome };
}

describe('Reconcile : reversements (E3)', () => {
  it('un reversement PENDING depuis 3 h n’expire pas (le délai des collectes ne s’applique pas)', async () => {
    const h = build({});
    expect(await h.service.reconcilePending(hoursLater(3))).toMatchObject({ expired: 0 });
    expect(h.provider.cancelPayout).not.toHaveBeenCalled();
    expect(h.tx.mobile_money_transactions.updateMany).not.toHaveBeenCalled();
  });

  it('au-delà de 48 h : annulé chez le fournisseur puis expiré, reversement notifié', async () => {
    const h = build({});
    expect(await h.service.reconcilePending(hoursLater(49))).toMatchObject({ expired: 1 });
    expect(h.provider.cancelPayout).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(h.tx.mobile_money_transactions.updateMany).toHaveBeenCalledTimes(1);
    expect(h.notifyOutcome).toHaveBeenCalledWith(expect.anything(), {
      organizationId: 'org-1',
      momoTransactionId: 'tx-1',
      state: 'EXPIRED',
    });
    // Dernière interrogation avant d'annuler (un callback d'approbation perdu).
    expect(h.verifyNow).toHaveBeenCalledWith('org-1', 'tx-1', { origin: 'RECONCILE' });
  });

  it('retrait non annulable (déjà approuvé) : PAS expiré, alerte', async () => {
    const h = build(
      {},
      { provider: { cancelPayout: jest.fn().mockResolvedValue('NOT_CANCELLABLE') } },
    );
    expect(await h.service.reconcilePending(hoursLater(49))).toMatchObject({ expired: 0 });
    expect(h.tx.mobile_money_transactions.updateMany).not.toHaveBeenCalled();
    expect(h.notifyOutcome).not.toHaveBeenCalled();
  });

  it('annulation en erreur technique : non expiré, repris au prochain passage', async () => {
    const h = build(
      {},
      { provider: { cancelPayout: jest.fn().mockRejectedValue(new Error('503')) } },
    );
    expect(await h.service.reconcilePending(hoursLater(49))).toMatchObject({ expired: 0 });
    expect(h.tx.mobile_money_transactions.updateMany).not.toHaveBeenCalled();
  });

  it('la dernière vérification a conclu (plus PENDING) : rien n’est annulé ni expiré', async () => {
    const h = build({}, { statusAfterVerify: 'SUCCEEDED' });
    expect(await h.service.reconcilePending(hoursLater(49))).toMatchObject({ expired: 0 });
    expect(h.provider.cancelPayout).not.toHaveBeenCalled();
  });

  it('fournisseur sans annulation (simulateur) : expiré directement', async () => {
    const h = build({}, { provider: { cancelPayout: undefined } });
    expect(await h.service.reconcilePending(hoursLater(49))).toMatchObject({ expired: 1 });
  });
});

describe('Reconcile : course d’expiration (M3)', () => {
  it('une confirmation concurrente a déjà changé la ligne : rien n’est écrit, pas compté expiré', async () => {
    const h = build({ purpose: 'RENT_COLLECTION' }, { updateCount: 0 });
    expect(await h.service.reconcilePending(hoursLater(5))).toMatchObject({ expired: 0 });
    expect(h.tx.mobile_money_transactions.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
  });
});

describe('Reconcile : INITIATED OpenPay sans référence (M1)', () => {
  const lost = { status: 'INITIATED', purpose: 'RENT_COLLECTION', aggregator_transaction_id: null };

  it('rejoue l’initiation avec la même clé et les mêmes paramètres, stocke la référence, relit le statut', async () => {
    const h = build(lost);
    const result = await h.service.reconcilePending(hoursLater(0.5));
    expect(h.provider.initiate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50_000n,
        payerMsisdn: '+242066203420',
        operator: 'MTN',
        externalReference: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );
    expect(h.tx.mobile_money_transactions.updateMany).toHaveBeenCalledWith({
      where: { id: 'tx-1', status: 'INITIATED', aggregator_transaction_id: null },
      data: { aggregator_transaction_id: 'PTXN1234ABCD' },
    });
    expect(h.verifyNow).toHaveBeenCalledWith('org-1', 'tx-1', { origin: 'RECONCILE' });
    expect(result).toMatchObject({ rechecked: 1, expired: 0 });
  });

  it('rejeu en échec : la ligne n’est pas expirée avant son délai, la suite du rattrapage continue', async () => {
    const h = build(lost, {
      provider: { initiate: jest.fn().mockRejectedValue(new Error('timeout')) },
    });
    expect(await h.service.reconcilePending(hoursLater(0.5))).toMatchObject({ expired: 0 });
    expect(h.tx.mobile_money_transactions.updateMany).not.toHaveBeenCalled();
  });

  it('rejeu tenté avant l’expiration : un paiement retrouvé à 61 min n’est pas expiré', async () => {
    const h = build(lost);
    expect(await h.service.reconcilePending(hoursLater(1.02))).toMatchObject({ expired: 0 });
    expect(h.provider.initiate).toHaveBeenCalledTimes(1);
  });

  it('fournisseur sans initiation idempotente, ou référence déjà connue : aucun rejeu', async () => {
    const plain = build(lost, { provider: { idempotentInitiation: undefined } });
    await plain.service.reconcilePending(hoursLater(0.5));
    expect(plain.provider.initiate).not.toHaveBeenCalled();
    const known = build({ ...lost, aggregator_transaction_id: 'PTXN1234ABCD' });
    await known.service.reconcilePending(hoursLater(0.5));
    expect(known.provider.initiate).not.toHaveBeenCalled();
  });
});
