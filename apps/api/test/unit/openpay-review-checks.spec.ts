import { MomoStatusChecker } from '../../src/modules/mobile-money/application/momo-status-checker';
import { OpenPayApiLimiter } from '../../src/modules/mobile-money/infrastructure/openpay.client';

/** Correctifs de la revue PR #62 : réservation des vérifications (claim) et plafond des callbacks. */

const cfg = (extra: Record<string, unknown> = {}) => ({
  get: (k: string) =>
    ({
      OPENPAY_API_KEY: 'cle',
      OPENPAY_BASE_URL: 'https://api.openpay-cg.com/v1',
      OPENPAY_MIN_CHECK_INTERVAL_SECONDS: 5,
      OPENPAY_MAX_CHECKS_PER_TRANSACTION: 3,
      QUEUE_PREFIX: 'test',
      ...extra,
    })[k],
});

describe('MomoStatusChecker.claim : anti-abus par origine', () => {
  const build = (
    row: Record<string, unknown> | null,
    trust: 'UNSIGNED_TRIGGER' | 'SIGNED' = 'UNSIGNED_TRIGGER',
    capOk = true,
  ) => {
    const tx = {
      $queryRawUnsafe: jest.fn().mockResolvedValue(row ? [row] : []),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      withTenant: jest.fn((_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tx)),
    };
    const limiter = { tryAcquireCallbackCheck: jest.fn().mockResolvedValue(capOk) };
    const registry = { forCode: () => ({ webhookTrust: trust }) };
    const checker = new MomoStatusChecker(
      cfg() as never,
      prisma as never,
      registry as never,
      limiter as never,
    );
    return { checker, tx, limiter };
  };
  const recent = () => ({
    aggregator: 'OPENPAY',
    status: 'PENDING',
    status_checked_at: new Date(Date.now() - 1_000),
  });
  const old = () => ({ ...recent(), status_checked_at: new Date(Date.now() - 60_000) });

  it('polling (REFRESH) : borné par l’intervalle minimal, jamais par un plafond à vie', async () => {
    const tooSoon = build(recent());
    expect(await tooSoon.checker.claim('o', 't', 'REFRESH')).toBe(false);
    expect(tooSoon.tx.$executeRawUnsafe).not.toHaveBeenCalled();
    const later = build(old(), 'UNSIGNED_TRIGGER', false);
    // Même avec un plafond de callbacks épuisé, le polling passe : le plafond ne le concerne pas.
    expect(await later.checker.claim('o', 't', 'REFRESH')).toBe(true);
    expect(later.limiter.tryAcquireCallbackCheck).not.toHaveBeenCalled();
    expect(later.tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('callback : intervalle minimal ET plafond par fenêtre glissante', async () => {
    const capped = build(old(), 'UNSIGNED_TRIGGER', false);
    expect(await capped.checker.claim('o', 't', 'CALLBACK')).toBe(false);
    const ok = build(old());
    expect(await ok.checker.claim('o', 't', 'CALLBACK')).toBe(true);
    expect(ok.limiter.tryAcquireCallbackCheck).toHaveBeenCalledWith('t');
  });

  it('rattrapage : jamais freiné, ni par l’intervalle ni par le plafond', async () => {
    const h = build(recent(), 'UNSIGNED_TRIGGER', false);
    expect(await h.checker.claim('o', 't', 'RECONCILE')).toBe(true);
    expect(h.tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('fournisseur signé : jamais freiné, mais la tentative est comptée', async () => {
    const h = build(recent(), 'SIGNED');
    expect(await h.checker.claim('o', 't', 'CALLBACK')).toBe(true);
    expect(String(h.tx.$executeRawUnsafe.mock.calls[0]?.[0])).toContain('status_check_count');
  });

  it('ligne non vérifiable (terminale) ou absente : rien n’est compté', async () => {
    for (const row of [{ ...recent(), status: 'SUCCEEDED' }, null]) {
      const h = build(row);
      expect(await h.checker.claim('o', 't', 'CALLBACK')).toBe(true);
      expect(h.tx.$executeRawUnsafe).not.toHaveBeenCalled();
    }
  });

  it('EXPIRED reste vérifiable (alerte de succès tardif), sous les mêmes freins', async () => {
    const h = build({ ...old(), status: 'EXPIRED' });
    expect(await h.checker.claim('o', 't', 'CALLBACK')).toBe(true);
    expect(h.tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  });
});

describe('OpenPayApiLimiter : plafond des callbacks par fenêtre glissante', () => {
  const build = () => {
    const store = new Map<string, number>();
    const redis = {
      get: jest.fn((k: string) => Promise.resolve(store.has(k) ? String(store.get(k)) : null)),
      incr: jest.fn((k: string) => {
        store.set(k, (store.get(k) ?? 0) + 1);
        return Promise.resolve(store.get(k) as number);
      }),
      expire: jest.fn().mockResolvedValue(1),
    };
    return { limiter: new OpenPayApiLimiter(redis as never, cfg() as never), store };
  };

  it('autorise le plafond puis refuse, par transaction', async () => {
    const { limiter } = build();
    for (let i = 0; i < 3; i += 1) expect(await limiter.tryAcquireCallbackCheck('t1')).toBe(true);
    expect(await limiter.tryAcquireCallbackCheck('t1')).toBe(false);
    expect(await limiter.tryAcquireCallbackCheck('t2')).toBe(true);
  });

  it('compte l’heure précédente (fenêtre glissante, pas de remise à zéro brutale)', async () => {
    const { limiter, store } = build();
    store.set(`test:rl:openpay-callback-check:t1:${Math.floor(Date.now() / 3_600_000) - 1}`, 3);
    expect(await limiter.tryAcquireCallbackCheck('t1')).toBe(false);
  });

  it('Redis indisponible : fail-open', async () => {
    const redis = {
      get: jest.fn().mockRejectedValue(new Error('down')),
      incr: jest.fn().mockRejectedValue(new Error('down')),
      expire: jest.fn(),
    };
    const limiter = new OpenPayApiLimiter(redis as never, cfg() as never);
    expect(await limiter.tryAcquireCallbackCheck('t')).toBe(true);
    expect(await limiter.tryAcquireCallbackRequest('1.2.3.4', 'VALID')).toBe(true);
  });
});
