import type { AppConfig } from '../../src/shared/config/config.schema';
import { ReadOnlyGuard } from '../../src/shared/read-only/read-only.guard';
import type { ReadOnlyService, ReadOnlyState } from '../../src/shared/read-only/read-only.service';

/** Tests unitaires purs (`jest.unit.config.js`, aucun accès base ni Redis). */

const FROZEN: ReadOnlyState = {
  enabled: true,
  reason: 'Restauration en cours',
  since: '2026-09-23T08:00:00.000Z',
  expectedEndAt: null,
  incidentRef: 'INC-12',
};

const OPEN: ReadOnlyState = {
  enabled: false,
  reason: null,
  since: null,
  expectedEndAt: null,
  incidentRef: null,
};

function fakeConfig(): AppConfig {
  return { API_GLOBAL_PREFIX: 'v1' } as unknown as AppConfig;
}

function makeGuard(state: ReadOnlyState) {
  const current = jest.fn().mockResolvedValue(state);
  const service = { current } as unknown as ReadOnlyService;
  return { guard: new ReadOnlyGuard(service, fakeConfig()), current };
}

function httpContext(method: string, path: string) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ method, path }) }),
  };
}

describe('ReadOnlyGuard', () => {
  it('laisse passer toute lecture, même pendant un gel', async () => {
    const { guard, current } = makeGuard(FROZEN);
    await expect(guard.canActivate(httpContext('GET', '/v1/leases') as never)).resolves.toBe(true);
    // L'état n'est même pas consulté : une lecture ne peut pas être gelée.
    expect(current).not.toHaveBeenCalled();
  });

  it('laisse passer les écritures quand la plateforme est ouverte', async () => {
    const { guard } = makeGuard(OPEN);
    await expect(guard.canActivate(httpContext('POST', '/v1/leases') as never)).resolves.toBe(true);
  });

  it('refuse une écriture ordinaire pendant un gel, avec Retry-After', async () => {
    const { guard } = makeGuard(FROZEN);
    await expect(
      guard.canActivate(httpContext('POST', '/v1/leases') as never),
    ).rejects.toMatchObject({
      code: 'PLATFORM.READ_ONLY',
      details: { reason: 'Restauration en cours', incidentRef: 'INC-12', retryAfterSeconds: 300 },
    });
  });

  it('déduit Retry-After de la fin annoncée quand elle est connue', async () => {
    const expectedEndAt = new Date(Date.now() + 120_000).toISOString();
    const { guard } = makeGuard({ ...FROZEN, expectedEndAt });
    await expect(
      guard.canActivate(httpContext('POST', '/v1/payments') as never),
    ).rejects.toMatchObject({
      details: { retryAfterSeconds: expect.any(Number) },
    });
  });

  it.each([
    ['POST', '/v1/auth/otp/request'],
    ['POST', '/v1/tenant-auth/otp/verify'],
    ['POST', '/v1/webhooks/mobile-money/mtn'],
    ['POST', '/v1/admin/read-only-mode'],
    ['POST', '/v1/admin/incidents'],
    ['POST', '/v1/admin/incidents/current/updates'],
    ['POST', '/v1/admin/incidents/current/resolve'],
    ['POST', '/v1/admin/feature-flags/platform_incident'],
    ['POST', '/v1/me/security/otp'],
    ['POST', '/v1/me/security/sessions/revoke-all'],
    ['DELETE', '/v1/me/security/sessions/abc'],
    ['POST', '/v1/organizations/o1/security/revoke-all'],
    ['DELETE', '/v1/organizations/o1/security/api-keys/k1'],
  ])('laisse passer %s %s pendant un gel', async (method, path) => {
    const { guard, current } = makeGuard(FROZEN);
    await expect(guard.canActivate(httpContext(method, path) as never)).resolves.toBe(true);
    expect(current).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', '/v1/admin/feature-flags/commercial_launch'],
    ['POST', '/v1/admin/go-live/waves/pilote/activate'],
    ['POST', '/v1/organizations/o1/security/api-keys'],
  ])('refuse %s %s pendant un gel', async (method, path) => {
    const { guard } = makeGuard(FROZEN);
    await expect(guard.canActivate(httpContext(method, path) as never)).rejects.toMatchObject({
      code: 'PLATFORM.READ_ONLY',
    });
  });

  it('ignore le préfixe global dans la reconnaissance des chemins', async () => {
    const { guard } = makeGuard(FROZEN);
    // Sans préfixe (montage direct) : le chemin doit être reconnu pareil.
    await expect(
      guard.canActivate(httpContext('POST', '/auth/otp/request') as never),
    ).resolves.toBe(true);
  });

  it('ne gèle pas un contexte non HTTP (travaux de fond)', async () => {
    const { guard } = makeGuard(FROZEN);
    const rpc = { getType: () => 'rpc' };
    await expect(guard.canActivate(rpc as never)).resolves.toBe(true);
  });
});
