import { OwnerPayoutsService } from '../../src/modules/owner-payouts/application/owner-payouts.service';
import type { MobileMoneyPayoutOutcomeListener } from '../../src/modules/mobile-money/domain/ports';

/** Issue d'un retrait OpenPay conclue par callback ou rattrapage : répercutée sur le reversement (M4, bonus). */
describe('OwnerPayoutsService : issue d’un décaissement Mobile Money hors POST /execute', () => {
  const build = (payout: Record<string, unknown> | null) => {
    const tx = {
      owner_payouts: {
        findFirst: jest.fn().mockResolvedValue(payout),
        update: jest.fn(),
      },
    };
    const statements = { markPaid: jest.fn().mockResolvedValue(undefined) };
    const auditService = { record: jest.fn() };
    let listener: MobileMoneyPayoutOutcomeListener | null = null;
    const service = new OwnerPayoutsService(
      {} as never,
      auditService as never,
      {} as never,
      statements as never,
      {} as never,
      {} as never,
      { onPayoutOutcome: (l: MobileMoneyPayoutOutcomeListener) => (listener = l) } as never,
    );
    service.onModuleInit();
    return {
      tx,
      statements,
      auditService,
      listener: () => listener as MobileMoneyPayoutOutcomeListener,
    };
  };
  const payout = { id: 'p1', status: 'PROCESSING', statement_id: 's1' };
  const outcome = (state: 'SUCCEEDED' | 'FAILED' | 'EXPIRED') => ({
    organizationId: 'o',
    momoTransactionId: 'm1',
    state,
  });

  it('s’inscrit auprès de mobile-money au démarrage', () => {
    expect(build(payout).listener()).toEqual(expect.any(Function));
  });

  it('SUCCEEDED : reversement PAID, relevé soldé, audit', async () => {
    const h = build(payout);
    await h.listener()(h.tx as never, outcome('SUCCEEDED'));
    expect(h.tx.owner_payouts.findFirst).toHaveBeenCalledWith({
      where: { momo_transaction_id: 'm1', status: 'PROCESSING' },
    });
    expect(h.tx.owner_payouts.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'PAID',
      failure_reason: null,
    });
    expect(h.statements.markPaid).toHaveBeenCalledWith(h.tx, 's1', expect.any(Date));
    expect(h.auditService.record).toHaveBeenCalledTimes(1);
  });

  it.each(['FAILED', 'EXPIRED'] as const)(
    '%s : reversement FAILED avec motif, relevé non soldé',
    async (state) => {
      const h = build(payout);
      await h.listener()(h.tx as never, outcome(state));
      expect(h.tx.owner_payouts.update.mock.calls[0]?.[0].data).toMatchObject({ status: 'FAILED' });
      expect(h.tx.owner_payouts.update.mock.calls[0]?.[0].data.failure_reason).toEqual(
        expect.any(String),
      );
      expect(h.statements.markPaid).not.toHaveBeenCalled();
    },
  );

  it('reversement déjà conclu (plus PROCESSING) : jamais retouché', async () => {
    const h = build(null);
    await h.listener()(h.tx as never, outcome('SUCCEEDED'));
    expect(h.tx.owner_payouts.update).not.toHaveBeenCalled();
    expect(h.statements.markPaid).not.toHaveBeenCalled();
  });
});
