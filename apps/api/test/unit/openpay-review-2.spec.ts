import { MomoPayoutService } from '../../src/modules/mobile-money/application/momo-payout.service';
import { MomoStatusChecker } from '../../src/modules/mobile-money/application/momo-status-checker';
import {
  OpenPayApiLimiter,
  OpenPayClient,
} from '../../src/modules/mobile-money/infrastructure/openpay.client';
import { OpenPayProvider } from '../../src/modules/mobile-money/infrastructure/openpay.provider';
import { resolveOpenPayTrigger } from '../../src/modules/mobile-money/infrastructure/momo-reference-resolver';
import { isInitiationReplayable } from '../../src/modules/mobile-money/domain/reconcile-rules';

/** Contre-revue PR #62 : N1 (refus d'exécution), N4 (budgets), N9 (indice EXPIRED), N12 (orphelin), N2 (fenêtre). */

const REF = '550e8400-e29b-41d4-a716-446655440000';
const cfg = (extra: Record<string, unknown> = {}) => ({
  get: (k: string) =>
    ({
      OPENPAY_API_KEY: 'cle',
      OPENPAY_BASE_URL: 'https://api.openpay-cg.com/v1',
      OPENPAY_STATUS_CALLS_PER_MINUTE: 1,
      OPENPAY_PRIORITY_CALLS_PER_MINUTE: 1,
      QUEUE_PREFIX: 'test',
      ...extra,
    })[k],
});
const expected = {
  kind: 'PAYOUT' as const,
  externalReference: REF,
  amount: 5_000n,
  currency: 'XAF',
};

describe('N1 : ordre d’exécution refusé vs issue incertaine', () => {
  const build = (respond: () => Response | Error) => {
    const client = new OpenPayClient(cfg() as never);
    client.fetchFn = (() => {
      const r = respond();
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
    }) as typeof fetch;
    return new OpenPayProvider(client, { tryAcquireStatusCall: jest.fn() } as never);
  };

  it.each([400, 404])(
    'HTTP %i : refus définitif, aucun virement (executeRefused)',
    async (status) => {
      const result = await build(() => new Response('{}', { status })).executePayout(REF, expected);
      expect(result).toMatchObject({ state: 'UNKNOWN', executeRefused: true });
    },
  );

  it.each([500, 503])(
    'HTTP %i : issue incertaine (erreur propagée, jamais « refusé »)',
    async (status) => {
      await expect(
        build(() => new Response('{}', { status })).executePayout(REF, expected),
      ).rejects.toMatchObject({ code: 'MOMO.PROVIDER_UNAVAILABLE' });
    },
  );

  it('réseau coupé : issue incertaine', async () => {
    await expect(
      build(() => new Error('socket hang up')).executePayout(REF, expected),
    ).rejects.toThrow();
  });

  it('cause de l’échec : AbortError = TIMEOUT, autre erreur réseau = NETWORK', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    await expect(build(() => abort).executePayout(REF, expected)).rejects.toMatchObject({
      details: { cause: 'TIMEOUT' },
    });
    await expect(
      build(() => new Error('connect ECONNREFUSED')).executePayout(REF, expected),
    ).rejects.toMatchObject({ details: { cause: 'NETWORK' } });
  });
});

describe('N4 : budgets d’appels séparés', () => {
  it('le polling épuise son budget sans toucher celui du rattrapage et des reversements', async () => {
    const counters = new Map<string, number>();
    const redis = {
      incr: jest.fn((k: string) =>
        Promise.resolve(counters.set(k, (counters.get(k) ?? 0) + 1) && (counters.get(k) as number)),
      ),
      expire: jest.fn(),
    };
    const limiter = new OpenPayApiLimiter(redis as never, cfg() as never);
    expect(await limiter.tryAcquireStatusCall('STANDARD')).toBe(true);
    expect(await limiter.tryAcquireStatusCall('STANDARD')).toBe(false);
    expect(await limiter.tryAcquireStatusCall('PRIORITY')).toBe(true);
  });

  it('un reversement et le rattrapage utilisent le budget PRIORITY, le polling le STANDARD', async () => {
    const client = new OpenPayClient(cfg() as never);
    client.fetchFn = (() => Promise.resolve(new Response('{}', { status: 404 }))) as typeof fetch;
    const limiter = { tryAcquireStatusCall: jest.fn().mockResolvedValue(true) };
    const provider = new OpenPayProvider(client, limiter as never);
    await provider.getStatus(REF, expected);
    await provider.getStatus('PTXN26042237B99A5D9', {
      kind: 'COLLECTION',
      externalReference: REF,
      amount: 1n,
      currency: 'XAF',
      origin: 'RECONCILE',
    });
    await provider.getStatus('PTXN26042237B99A5D9', {
      kind: 'COLLECTION',
      externalReference: REF,
      amount: 1n,
      currency: 'XAF',
      origin: 'REFRESH',
    });
    expect(limiter.tryAcquireStatusCall.mock.calls.map((c) => c[0])).toEqual([
      'PRIORITY',
      'PRIORITY',
      'STANDARD',
    ]);
  });
});

describe('N9 : indice d’un callback sur transaction EXPIRED', () => {
  it('la recherche par indice couvre aussi EXPIRED', async () => {
    const admin = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };
    await resolveOpenPayTrigger(admin as never, {
      reference: 'PTXN26042237B99A5D9',
      type: 'payment',
      externalReferenceHint: REF,
    });
    const sql = admin.$queryRawUnsafe.mock.calls[1]?.[0] as string;
    expect(sql).toContain("status IN ('INITIATED', 'EXPIRED')");
  });
});

describe('N2 : fenêtre de rejeu', () => {
  const t0 = new Date('2026-10-01T10:00:00Z');
  const at = (m: number) => new Date(t0.getTime() + m * 60_000);
  it('ni trop tôt, ni après la fenêtre', () => {
    expect(isInitiationReplayable(t0, at(0.2))).toBe(false);
    expect(isInitiationReplayable(t0, at(3))).toBe(true);
    expect(isInitiationReplayable(t0, at(6))).toBe(false);
    expect(isInitiationReplayable(t0, at(30))).toBe(false);
  });
});

describe('N12 : retrait orphelin', () => {
  const build = (provider: Record<string, unknown>) => {
    const registry = { forCode: () => provider };
    const service = new MomoPayoutService(
      registry as never,
      { get: () => 'http://localhost' } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return service;
  };
  const input = {
    organizationId: 'org',
    amount: 5_000n,
    currency: 'XAF' as const,
    payerMsisdn: '+242066203420',
    externalReference: 'REV-1',
    description: 'd',
  };
  const tx = (failOnUpdate: boolean) => ({
    organization_settings: { findUnique: jest.fn().mockResolvedValue(null) },
    mobile_money_transactions: {
      create: jest.fn(),
      update: jest.fn(() =>
        failOnUpdate ? Promise.reject(new Error('rollback')) : Promise.resolve({}),
      ),
    },
  });

  it('échec APRÈS la création chez le fournisseur : annulation au mieux de ce retrait', async () => {
    const cancelPayout = jest.fn().mockResolvedValue('CANCELLED');
    const provider = {
      code: 'OPENPAY',
      newPayoutReference: () => REF,
      initiate: jest
        .fn()
        .mockResolvedValue({ providerReference: REF, state: 'PENDING', rawPayload: {} }),
      getStatus: jest
        .fn()
        .mockResolvedValue({ state: 'PENDING', providerReference: REF, rawPayload: null }),
      cancelPayout,
    };
    await expect(build(provider).initiatePayout(tx(true) as never, input)).rejects.toThrow(
      'rollback',
    );
    expect(cancelPayout).toHaveBeenCalledWith(REF);
  });

  it('échec de l’annulation : jamais d’exception masquant l’erreur d’origine', async () => {
    const provider = {
      code: 'OPENPAY',
      newPayoutReference: () => REF,
      initiate: jest
        .fn()
        .mockResolvedValue({ providerReference: REF, state: 'PENDING', rawPayload: {} }),
      getStatus: jest
        .fn()
        .mockResolvedValue({ state: 'PENDING', providerReference: REF, rawPayload: null }),
      cancelPayout: jest.fn().mockRejectedValue(new Error('503')),
    };
    await expect(build(provider).initiatePayout(tx(true) as never, input)).rejects.toThrow(
      'rollback',
    );
  });

  it('merchant_reference suffixée à partir de la 2e tentative (N5)', async () => {
    const provider = {
      code: 'OPENPAY',
      newPayoutReference: () => REF,
      initiate: jest
        .fn()
        .mockResolvedValue({ providerReference: REF, state: 'PENDING', rawPayload: {} }),
      getStatus: jest
        .fn()
        .mockResolvedValue({ state: 'PENDING', providerReference: REF, rawPayload: null }),
    };
    const t = tx(false);
    await build(provider).initiatePayout(t as never, { ...input, attempt: 2 });
    expect(t.mobile_money_transactions.create.mock.calls[0]?.[0].data.merchant_reference).toBe(
      'REV-1-2',
    );
  });
});

describe('N6 : callback freiné remis en file', () => {
  const build = (checkedAgoMs: number) => {
    const tx = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          aggregator: 'OPENPAY',
          status: 'PENDING',
          status_checked_at: new Date(Date.now() - checkedAgoMs),
        },
      ]),
      $executeRawUnsafe: jest.fn(),
    };
    const prisma = { withTenant: (_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tx) };
    const registry = { forCode: () => ({ webhookTrust: 'UNSIGNED_TRIGGER' }) };
    const checker = new MomoStatusChecker(
      { get: () => 10 } as never,
      prisma as never,
      registry as never,
      { tryAcquireCallbackCheck: jest.fn().mockResolvedValue(true) } as never,
    );
    return checker;
  };

  it('freiné par l’intervalle : le reste de l’intervalle est transmis à la remise en file', async () => {
    const onThrottled = jest.fn().mockResolvedValue(undefined);
    expect(await build(4_000).claim('o', 't', 'CALLBACK', onThrottled)).toBe(false);
    const delay = onThrottled.mock.calls[0]?.[0] as number;
    expect(delay).toBeGreaterThan(5_000);
    expect(delay).toBeLessThanOrEqual(6_000);
  });

  it('intervalle écoulé : vérification réservée, pas de remise en file', async () => {
    const onThrottled = jest.fn();
    expect(await build(60_000).claim('o', 't', 'CALLBACK', onThrottled)).toBe(true);
    expect(onThrottled).not.toHaveBeenCalled();
  });
});
