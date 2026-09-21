import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  ReferralPartnerGuard,
  type ReferralPartnerContext,
} from '../../src/modules/referral/presentation/referral-partner.guard';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base) — calqués
 * sur `test/unit/tenant-portal.spec.ts` (`TenantPortalGuard`).
 */
function fakeReflector(returns: boolean): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(returns) } as unknown as Reflector;
}

function httpContext(request: unknown) {
  return {
    getType: () => 'http',
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  };
}

/**
 * `ReferralPartnerGuard` lit `referral_partners` (RLS `partner_self`) via
 * `PrismaService.withUser`, jamais directement — voir sa docstring. Le faux
 * client reproduit ce contrat minimalement : `withUser` exécute `fn` avec le
 * même délégué `referral_partners` que l'appelant contrôle.
 */
function fakePrisma(referralPartners: { findUnique: jest.Mock }) {
  return {
    referral_partners: referralPartners,
    withUser: jest.fn((_userId: string, fn: (tx: unknown) => unknown) =>
      fn({ referral_partners: referralPartners }),
    ),
  };
}

describe('ReferralPartnerGuard', () => {
  it('laisse passer une route sans @ReferralPartner()', async () => {
    const prisma = fakePrisma({ findUnique: jest.fn() });
    const guard = new ReferralPartnerGuard(fakeReflector(false), prisma as never);
    const context = { getType: () => 'http', getHandler: () => null, getClass: () => null };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(prisma.referral_partners.findUnique).not.toHaveBeenCalled();
  });

  it('refuse sans utilisateur authentifié', async () => {
    const prisma = fakePrisma({ findUnique: jest.fn() });
    const guard = new ReferralPartnerGuard(fakeReflector(true), prisma as never);
    const request = {} as Request & { user?: unknown };
    await expect(guard.canActivate(httpContext(request) as never)).rejects.toMatchObject({
      code: 'IAM.UNAUTHENTICATED',
    });
  });

  it("refuse REFERRALS.PARTNER_NOT_FOUND si l'utilisateur n'est pas partenaire", async () => {
    const prisma = fakePrisma({ findUnique: jest.fn().mockResolvedValue(null) });
    const guard = new ReferralPartnerGuard(fakeReflector(true), prisma as never);
    const request = { user: { userId: 'u1' } } as Request & { user?: { userId: string } };
    await expect(guard.canActivate(httpContext(request) as never)).rejects.toMatchObject({
      code: 'REFERRALS.PARTNER_NOT_FOUND',
    });
  });

  it('refuse un partenaire CLOSED comme s’il n’existait pas', async () => {
    const prisma = fakePrisma({
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'p1', user_id: 'u1', status: 'CLOSED', organization_id: null }),
    });
    const guard = new ReferralPartnerGuard(fakeReflector(true), prisma as never);
    const request = { user: { userId: 'u1' } } as Request & { user?: { userId: string } };
    await expect(guard.canActivate(httpContext(request) as never)).rejects.toMatchObject({
      code: 'REFERRALS.PARTNER_NOT_FOUND',
    });
  });

  it('pose request.referralPartner pour un partenaire valide', async () => {
    const partner = { id: 'p1', user_id: 'u1', status: 'ACTIVE', organization_id: null };
    const prisma = fakePrisma({ findUnique: jest.fn().mockResolvedValue(partner) });
    const guard = new ReferralPartnerGuard(fakeReflector(true), prisma as never);
    const request = { user: { userId: 'u1' } } as Request & {
      user?: { userId: string };
      referralPartner?: ReferralPartnerContext;
    };
    await expect(guard.canActivate(httpContext(request) as never)).resolves.toBe(true);
    expect(request.referralPartner).toEqual({
      id: 'p1',
      userId: 'u1',
      status: 'ACTIVE',
      organizationId: null,
    });
  });
});
