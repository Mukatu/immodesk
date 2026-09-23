import type { Reflector } from '@nestjs/core';
import { TenantConsentGuard } from '../../src/modules/privacy/presentation/tenant-consent.guard';

/** Tests unitaires purs : aucune base, aucun Redis. */

const USER = { userId: 'u-1' };
const LEASES = [{ organizationId: 'org-1', tenantId: 't-1' }];

function fakeReflector(isPortalRoute: boolean): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(isPortalRoute) } as unknown as Reflector;
}

function makeGuard(options: {
  portalRoute?: boolean;
  acceptedVersion?: string | null;
  leases?: Array<{ organizationId: string; tenantId: string }>;
}) {
  const { portalRoute = true, acceptedVersion = null, leases = LEASES } = options;

  const findFirst = jest.fn().mockResolvedValue(
    acceptedVersion === null
      ? null
      : {
          occurred_at: new Date('2026-09-01T00:00:00.000Z'),
          new_state: { legalVersion: acceptedVersion, acceptedAt: '2026-09-01T00:00:00.000Z' },
        },
  );
  const prisma = {
    withTenant: jest.fn((_org: string, _user: string, fn: (tx: unknown) => unknown) =>
      fn({ audit_logs: { findFirst } }),
    ),
  };
  const config = { get: jest.fn().mockReturnValue('2026-09') };
  const directory = { listActiveTenantLeases: jest.fn().mockResolvedValue(leases) };

  const guard = new TenantConsentGuard(
    fakeReflector(portalRoute),
    prisma as never,
    config as never,
    directory as never,
  );
  return { guard, findFirst, directory };
}

function context(method: string, path: string, user: unknown = USER) {
  return {
    getType: () => 'http',
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ method, path, user }) }),
  };
}

describe('TenantConsentGuard', () => {
  it('ignore les routes hors portail locataire', async () => {
    const { guard, directory } = makeGuard({ portalRoute: false });
    await expect(guard.canActivate(context('POST', '/v1/leases') as never)).resolves.toBe(true);
    expect(directory.listActiveTenantLeases).not.toHaveBeenCalled();
  });

  it('laisse lire le portail sans consentement', async () => {
    const { guard, directory } = makeGuard({ acceptedVersion: null });
    await expect(guard.canActivate(context('GET', '/v1/tenant/invoices') as never)).resolves.toBe(
      true,
    );
    expect(directory.listActiveTenantLeases).not.toHaveBeenCalled();
  });

  it('refuse une écriture tant que rien n’est accepté', async () => {
    const { guard } = makeGuard({ acceptedVersion: null });
    await expect(
      guard.canActivate(context('POST', '/v1/tenant/bank-transfers') as never),
    ).rejects.toMatchObject({ code: 'PRIVACY.CONSENT_REQUIRED' });
  });

  it('refuse une écriture si la version acceptée est périmée', async () => {
    const { guard } = makeGuard({ acceptedVersion: '2025-01' });
    await expect(
      guard.canActivate(context('POST', '/v1/tenant/bank-transfers') as never),
    ).rejects.toMatchObject({ code: 'PRIVACY.CONSENT_REQUIRED' });
  });

  it('laisse passer une écriture quand la version courante est acceptée', async () => {
    const { guard } = makeGuard({ acceptedVersion: '2026-09' });
    await expect(
      guard.canActivate(context('POST', '/v1/tenant/bank-transfers') as never),
    ).resolves.toBe(true);
  });

  it('n’exige jamais le consentement sur la route qui le recueille', async () => {
    const { guard, directory } = makeGuard({ acceptedVersion: null });
    // Sinon le consentement serait impossible à donner.
    await expect(
      guard.canActivate(context('POST', '/v1/tenant/privacy/consents') as never),
    ).resolves.toBe(true);
    expect(directory.listActiveTenantLeases).not.toHaveBeenCalled();
  });

  it('laisse TenantPortalGuard trancher quand aucun bail actif n’existe', async () => {
    const { guard } = makeGuard({ acceptedVersion: null, leases: [] });
    await expect(
      guard.canActivate(context('POST', '/v1/tenant/bank-transfers') as never),
    ).resolves.toBe(true);
  });
});
