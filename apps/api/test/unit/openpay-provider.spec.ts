import { MomoPayoutService } from '../../src/modules/mobile-money/application/momo-payout.service';
import { MomoReconcileService } from '../../src/modules/mobile-money/application/momo-reconcile.service';
import { MomoStatusChecker } from '../../src/modules/mobile-money/application/momo-status-checker';
import { OpenPayCallbackGate } from '../../src/modules/mobile-money/infrastructure/openpay-callback.gate';
import {
  OpenPayApiLimiter,
  OpenPayClient,
} from '../../src/modules/mobile-money/infrastructure/openpay.client';
import { OpenPayProvider } from '../../src/modules/mobile-money/infrastructure/openpay.provider';

const TX = '0197a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b';
const REF = 'PTXN26042237B99A5D9';
const SECRET = 's'.repeat(40);

const config = (extra: Record<string, unknown> = {}) => ({
  get: (k: string) =>
    ({
      OPENPAY_API_KEY: 'cle-secrete-de-test',
      OPENPAY_BASE_URL: 'https://api.openpay-cg.com/v1',
      OPENPAY_CALLBACK_SECRET: SECRET,
      OPENPAY_STATUS_CALLS_PER_MINUTE: 2,
      QUEUE_PREFIX: 'test',
      ...extra,
    })[k],
});

function build(responder: (url: string, init: RequestInit) => { status: number; body: unknown }) {
  const client = new OpenPayClient(config() as never);
  const calls: Array<{ url: string; init: RequestInit }> = [];
  client.fetchFn = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responder(url, init);
    return Promise.resolve(new Response(JSON.stringify(r.body), { status: r.status }));
  }) as typeof fetch;
  const limiter = { tryAcquireStatusCall: jest.fn().mockResolvedValue(true) };
  return { provider: new OpenPayProvider(client, limiter as never), calls, limiter };
}

const initiateInput = {
  amount: 10_000n,
  currency: 'XAF' as const,
  payerMsisdn: '+242066203420',
  operator: 'MTN' as const,
  externalReference: TX,
  description: 'd',
  callbackUrl: '',
};

describe('OpenPayProvider : initiation', () => {
  it('envoie XO-API-KEY, Idempotency-Key, metadata et numéro sans +', async () => {
    const { provider, calls } = build(() => ({
      status: 200,
      body: { reference: REF, status: 'pending', type: 'payment' },
    }));
    const result = await provider.initiate(initiateInput);
    expect(result).toMatchObject({ providerReference: REF, state: 'PENDING' });
    const { url, init } = calls[0] as { url: string; init: RequestInit };
    expect(url).toBe('https://api.openpay-cg.com/v1/transaction/payment');
    const headers = init.headers as Record<string, string>;
    expect(headers['XO-API-KEY']).toBe('cle-secrete-de-test');
    expect(headers['Idempotency-Key']).toBe(TX);
    expect(JSON.parse(init.body as string)).toEqual({
      amount: 10_000,
      payment_phone_number: '242066203420',
      provider: 'MTN',
      metadata: { external_reference: TX },
    });
  });

  it.each([401, 403, 429, 500, 503])(
    'HTTP %s : indisponible, sans fuite de la clé',
    async (status) => {
      const { provider } = build(() => ({ status, body: { error: 'x' } }));
      await expect(provider.initiate(initiateInput)).rejects.toMatchObject({
        code: 'MOMO.PROVIDER_UNAVAILABLE',
      });
    },
  );

  it('400 : échec définitif ; 422 (clé réutilisée) : erreur', async () => {
    expect(
      (await build(() => ({ status: 400, body: { error: 'm' } })).provider.initiate(initiateInput))
        .state,
    ).toBe('FAILED');
    await expect(
      build(() => ({ status: 422, body: {} })).provider.initiate(initiateInput),
    ).rejects.toBeDefined();
  });

  it('timeout réseau : indisponible', async () => {
    const client = new OpenPayClient(config() as never);
    client.fetchFn = (() => Promise.reject(new Error('boom 242066203420'))) as typeof fetch;
    const provider = new OpenPayProvider(client, { tryAcquireStatusCall: jest.fn() } as never);
    await expect(provider.initiate(initiateInput)).rejects.toMatchObject({
      code: 'MOMO.PROVIDER_UNAVAILABLE',
    });
  });

  it('webhook : jamais signé, UNSIGNED_TRIGGER', () => {
    const { provider } = build(() => ({ status: 200, body: {} }));
    expect(provider.webhookTrust).toBe('UNSIGNED_TRIGGER');
    expect(provider.verifyWebhook()).toBe(false);
  });
});

describe('OpenPayProvider : statut et limiteur', () => {
  const expected = {
    kind: 'COLLECTION' as const,
    externalReference: TX,
    amount: 10_000n,
    currency: 'XAF',
  };

  it('refuse une référence mal formée sans appeler OpenPay', async () => {
    const { provider, calls } = build(() => ({ status: 200, body: {} }));
    expect((await provider.getStatus('../../x', expected)).state).toBe('UNKNOWN');
    expect(calls).toHaveLength(0);
  });

  it('limite globale dépassée : aucun appel', async () => {
    const { provider, calls, limiter } = build(() => ({ status: 200, body: {} }));
    limiter.tryAcquireStatusCall.mockResolvedValue(false);
    await expect(provider.getStatus(REF, expected)).rejects.toMatchObject({
      code: 'MOMO.PROVIDER_UNAVAILABLE',
    });
    expect(calls).toHaveLength(0);
  });

  it('limiteur Redis : fenêtre fixe, au-delà du plafond refusé', async () => {
    let n = 0;
    const redis = { incr: jest.fn(() => Promise.resolve(++n)), expire: jest.fn() };
    const limiter = new OpenPayApiLimiter(redis as never, config() as never);
    expect(await limiter.tryAcquireStatusCall()).toBe(true);
    expect(await limiter.tryAcquireStatusCall()).toBe(true);
    expect(await limiter.tryAcquireStatusCall()).toBe(false);
  });
});

describe('OpenPayCallbackGate', () => {
  const gate = (extra: Record<string, unknown>) => new OpenPayCallbackGate(config(extra) as never);
  it('segment secret : bon, mauvais, absent, secret non configuré', () => {
    expect(gate({}).check(SECRET, '1.2.3.4')).toBe('OK');
    expect(gate({}).check('x'.repeat(40), null)).toBe('BAD_SECRET');
    expect(gate({}).check(undefined, null)).toBe('BAD_SECRET');
    expect(gate({ OPENPAY_CALLBACK_SECRET: undefined }).check(SECRET, null)).toBe('NOT_CONFIGURED');
  });
  it('allowlist : vide = pas de filtrage ; sinon IP exigée (IPv4 mappée normalisée)', () => {
    expect(gate({ OPENPAY_CALLBACK_IP_ALLOWLIST: undefined }).check(SECRET, '9.9.9.9')).toBe('OK');
    const g = gate({ OPENPAY_CALLBACK_IP_ALLOWLIST: ['1.2.3.4'] });
    expect(g.check(SECRET, '::ffff:1.2.3.4')).toBe('OK');
    expect(g.check(SECRET, '5.6.7.8')).toBe('IP_DENIED');
  });
});

describe('Reversement : execute seulement si la transaction est conforme', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: TX,
    organization_id: 'o',
    amount: 50_000n,
    currency: 'XAF',
    aggregator: 'OPENPAY',
    aggregator_transaction_id: TX,
    external_reference: TX,
    payer_msisdn: '+242066203420',
    purpose: 'OWNER_PAYOUT',
    direction: 'OUTBOUND',
    status: 'PENDING',
    status_checked_at: null,
    status_check_count: 0,
    ...over,
  });
  const run = async (txRow: Record<string, unknown>, approved: boolean) => {
    const executePayout = jest.fn().mockResolvedValue({
      state: 'SUCCEEDED',
      providerReference: TX,
      amount: 50_000n,
      currency: 'XAF',
      rawPayload: null,
    });
    const getStatus = jest.fn().mockResolvedValue({
      state: 'PENDING',
      providerReference: TX,
      amount: 50_000n,
      currency: 'XAF',
      matched: true,
      ...(approved ? { nextAction: 'EXECUTE' } : {}),
      rawPayload: null,
    });
    const provider = { webhookTrust: 'UNSIGNED_TRIGGER', getStatus, executePayout };
    const tx = {
      mobile_money_transactions: {
        findFirst: jest.fn().mockResolvedValue(txRow),
        update: jest.fn(),
      },
    };
    const checker = new MomoStatusChecker(
      config({
        OPENPAY_MIN_CHECK_INTERVAL_SECONDS: 0,
        OPENPAY_MAX_CHECKS_PER_TRANSACTION: 9,
      }) as never,
      { adminClient: () => null } as never,
    );
    jest.spyOn(checker, 'claimTriggerEvents').mockResolvedValue(undefined);
    const service = new MomoPayoutService(
      { forCode: () => provider } as never,
      config() as never,
      checker,
    );
    const result = await service.refreshPayoutStatus(tx as never, TX);
    return { executePayout, result };
  };

  it('approuvé + transaction OWNER_PAYOUT sortante PENDING : execute appelé, SUCCEEDED', async () => {
    const { executePayout, result } = await run(row(), true);
    expect(executePayout).toHaveBeenCalledTimes(1);
    expect(result.state).toBe('SUCCEEDED');
  });

  it.each([
    ['pas encore approuvé', row(), false],
    ['transaction déjà SUCCEEDED', row({ status: 'SUCCEEDED' }), true],
    ['purpose loyer', row({ purpose: 'RENT_COLLECTION' }), true],
    ['direction entrante', row({ direction: 'INBOUND' }), true],
  ])('pas d’execute : %s', async (_l, txRow, approved) => {
    const { executePayout } = await run(txRow, approved);
    expect(executePayout).not.toHaveBeenCalled();
  });
});

describe('Réconciliation : INITIATED jamais mis à jour -> EXPIRED', () => {
  it('expire après le délai configurable, avec transition d’audit', async () => {
    const admin = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          id: 'i1',
          organization_id: 'o',
          status: 'INITIATED',
          purpose: 'SUBSCRIPTION',
          initiated_at: new Date('2026-09-10T08:00:00Z'),
          status_checked_at: null,
          status_check_count: 0,
          external_reference: null,
        },
      ]),
      organization_settings: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const update = jest.fn();
    const tx = {
      mobile_money_transactions: {
        findFirst: jest.fn().mockResolvedValue({ id: 'i1', payment_id: null, status: 'INITIATED' }),
        update,
      },
    };
    const prisma = {
      adminClient: () => admin,
      withTenant: (_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tx),
    };
    const service = new MomoReconcileService(
      prisma as never,
      { handlerFor: () => null } as never,
      { record: jest.fn() } as never,
      { get: () => 60 } as never,
    );
    expect(await service.reconcilePending(new Date('2026-09-10T08:30:00Z'))).toEqual({
      rechecked: 0,
      expired: 0,
    });
    expect(await service.reconcilePending(new Date('2026-09-10T09:01:00Z'))).toEqual({
      rechecked: 0,
      expired: 1,
    });
    expect(update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { status: 'EXPIRED' } });
  });
});
