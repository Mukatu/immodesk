import { Logger } from '@nestjs/common';
import { MomoPayoutService } from '../../src/modules/mobile-money/application/momo-payout.service';

/** Suivi PR #62 : garde-fous des décisions manuelles sur les reversements Mobile Money. */

const MIN = 60_000;
type Cashout = 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected';

const rowOf = (over: Record<string, unknown> = {}) => ({
  id: 'momo-1',
  organization_id: 'org-1',
  status: 'PENDING',
  purpose: 'OWNER_PAYOUT',
  direction: 'OUTBOUND',
  aggregator: 'OPENPAY',
  aggregator_transaction_id: 'PTXN1',
  external_reference: 'REF-1',
  payer_msisdn: '+242066203420',
  amount: 5_000n,
  currency: 'XAF',
  payout_execute_sent_at: null,
  payout_execute_refused_at: null,
  payout_alert_code: 'BLOCKED',
  failure_code: null,
  ...over,
});

function build(row: Record<string, unknown>, provider: 'notFound' | Cashout, minutes?: unknown) {
  const getStatus = jest.fn().mockResolvedValue(
    provider === 'notFound'
      ? { state: 'UNKNOWN', providerReference: 'PTXN1', rawPayload: null, notFound: true }
      : {
          state: 'PENDING',
          providerReference: 'PTXN1',
          rawPayload: null,
          matched: true,
          cashoutStatus: provider,
        },
  );
  const cancelPayout = jest.fn().mockResolvedValue('CANCELLED');
  const config = {
    get: (key: string) => (key === 'MOMO_PAYOUT_RETRY_MIN_AGE_MINUTES' ? minutes : 'x'),
  };
  const service = new MomoPayoutService(
    { forCode: () => ({ getStatus, cancelPayout }) } as never,
    config as never,
    {} as never,
    {} as never,
    { enqueue: jest.fn().mockResolvedValue(undefined) } as never,
  );
  const tx = {
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    mobile_money_transactions: {
      findFirst: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  return { service, tx, getStatus };
}

const sentAgo = (ms: number) => ({ payout_execute_sent_at: new Date(Date.now() - ms) });
const refusal = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('résolution acceptée à tort');
    },
    (error: { code?: string; details?: { reason?: string } }) => error,
  );

describe('point 1 : RETRY après issue incertaine', () => {
  it('refusé tant que le délai configuré n’est pas écoulé, sans relire ni lever le marqueur', async () => {
    const { service, tx, getStatus } = build(rowOf(sentAgo(14 * MIN)), 'approved', 15);
    const error = await refusal(service.resolveBlockedPayout(tx as never, 'momo-1', 'RETRY'));
    expect(error.code).toBe('MOMO.RESOLUTION_REFUSED');
    expect(error.details?.reason).toContain('15 min');
    expect(getStatus).not.toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('accepté une fois le délai écoulé et le retrait relu approuvé : marqueur levé', async () => {
    const { service, tx } = build(rowOf(sentAgo(16 * MIN)), 'approved', 15);
    const done = await service.resolveBlockedPayout(tx as never, 'momo-1', 'RETRY');
    expect(done.markerCleared).toBe(true);
    expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('délai configurable, défaut de 15 min si la valeur est absente ou invalide', async () => {
    const long = build(rowOf(sentAgo(30 * MIN)), 'approved', 60);
    expect(
      (await refusal(long.service.resolveBlockedPayout(long.tx as never, 'momo-1', 'RETRY'))).code,
    ).toBe('MOMO.RESOLUTION_REFUSED');
    const fallback = build(rowOf(sentAgo(10 * MIN)), 'approved', undefined);
    expect(
      (
        await refusal(
          fallback.service.resolveBlockedPayout(fallback.tx as never, 'momo-1', 'RETRY'),
        )
      ).details?.reason,
    ).toContain('15 min');
  });

  it('MARK_PAID reste soumis au seul délai de 60 s', async () => {
    const { service, tx } = build(rowOf(sentAgo(2 * MIN)), 'completed', 15);
    const done = await service.resolveBlockedPayout(tx as never, 'momo-1', 'MARK_PAID');
    expect(done.status).toBe('SUCCEEDED');
  });
});

describe('point 2 : 404 et marqueur d’ordre', () => {
  it('MARK_FAILED refusé si le retrait est introuvable alors qu’un ordre a été donné', async () => {
    const { service, tx } = build(rowOf(sentAgo(30 * MIN)), 'notFound');
    const error = await refusal(service.resolveBlockedPayout(tx as never, 'momo-1', 'MARK_FAILED'));
    expect(error.code).toBe('MOMO.RESOLUTION_REFUSED');
    expect(error.details?.reason).toContain('référence connue puis disparue');
    expect(tx.mobile_money_transactions.update).not.toHaveBeenCalled();
  });

  it('MARK_FAILED accepté sur 404 si aucun ordre n’a jamais été donné', async () => {
    const { service, tx } = build(rowOf(), 'notFound');
    const done = await service.resolveBlockedPayout(tx as never, 'momo-1', 'MARK_FAILED');
    expect(done.status).toBe('FAILED');
  });

  it('nouvelle tentative : 404 refusé avec marqueur, accepté sans ; cancelled toujours accepté', async () => {
    const marked = build(rowOf(sentAgo(30 * MIN)), 'notFound');
    const error = await refusal(marked.service.assertNoTransferSent(marked.tx as never, 'momo-1'));
    expect(error.details?.reason).toContain('référence connue puis disparue');
    const clean = build(rowOf(), 'notFound');
    await expect(
      clean.service.assertNoTransferSent(clean.tx as never, 'momo-1'),
    ).resolves.toBeUndefined();
    const cancelled = build(rowOf(sentAgo(30 * MIN)), 'cancelled');
    await expect(
      cancelled.service.assertNoTransferSent(cancelled.tx as never, 'momo-1'),
    ).resolves.toBeUndefined();
  });
});

describe('point 5 : alerte BLOCKED déjà posée', () => {
  const run = async (code: string) => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    const { service } = build(rowOf(), 'pending');
    const prisma = { withTenant: (_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tx) };
    const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };
    (service as unknown as { prisma: unknown }).prisma = prisma;
    await service.alertOnce('org-1', 'momo-1', 'BLOCKED', code, 'détail');
    const result = { error: error.mock.calls.length, debug: debug.mock.calls.length };
    jest.restoreAllMocks();
    return result;
  };

  it('une issue incertaine d’execute est journalisée en erreur même si BLOCKED est déjà posée', async () => {
    expect(await run('MOMO.PAYOUT_EXECUTE_UNKNOWN')).toEqual({ error: 1, debug: 0 });
  });

  it('une alerte répétitive reste en debug', async () => {
    expect(await run('MOMO.PAYOUT_EXECUTE_ALREADY_SENT')).toEqual({ error: 0, debug: 1 });
  });
});
