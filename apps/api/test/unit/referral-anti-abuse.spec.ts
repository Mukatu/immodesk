import { ReferralCodeService } from '../../src/modules/referral/application/referral-code.service';
import { ReferralPropertyLeadService } from '../../src/modules/referral/application/referral-property-lead.service';
import type { ActiveProgram } from '../../src/modules/referral/application/referral-programs.service';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base) : anti-abus
 * de l'apport d'affaires (docs/api/phase10-contract.md, § Apport d'affaires
 * — « un partenaire ne peut pas se parrainer lui-même, ni parrainer une
 * organisation dont il est déjà membre » ; unicité `referrals_org_uk`).
 */
const PROGRAM: ActiveProgram = {
  id: 'program-1',
  code: 'IMD-STD',
  rateBps: 2000,
  durationMonths: 12,
  minPayoutAmount: 5000n,
  monthlyCapAmount: null,
  currency: 'XAF',
};

function programs() {
  return {
    getActiveDefault: jest.fn().mockResolvedValue(PROGRAM),
    getById: jest.fn().mockResolvedValue(PROGRAM),
  };
}

function uniqueViolation(constraint: string) {
  return Object.assign(new Error('duplicate'), { code: 'P2002', meta: { target: constraint } });
}

/**
 * `ReferralCodeService` (BYPASSRLS, `PrismaService.withAdmin`) et
 * `ReferralPropertyLeadService.confirm` (`PrismaService.withUser`, RLS
 * `partner_self`) n'accèdent plus jamais `referral_partners`/`referrals`
 * directement — voir leurs docstrings. Le faux client reproduit les deux
 * points d'entrée en exécutant `fn` avec le même délégué contrôlé par
 * l'appelant, pour que les assertions existantes (`prisma.referrals.create`,
 * etc.) restent valables telles quelles.
 */
function fakePrisma(
  overrides: {
    referral_partners?: Record<string, jest.Mock>;
    referrals?: Record<string, jest.Mock>;
  } = {},
) {
  const tables = {
    referral_partners: overrides.referral_partners ?? {},
    referrals: overrides.referrals ?? {},
  };
  return {
    ...tables,
    withAdmin: jest.fn((fn: (tx: unknown) => unknown) => fn(tables)),
    withUser: jest.fn((_userId: string, fn: (tx: unknown) => unknown) => fn(tables)),
  };
}

describe('ReferralCodeService.attach — anti-abus', () => {
  const partner = {
    id: 'partner-1',
    user_id: 'user-1',
    organization_id: 'own-org',
    partner_code: 'IMD-4K7QRT',
  };

  it('refuse REFERRALS.PARTNER_NOT_FOUND si le code est inconnu', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(null) },
      referrals: { create: jest.fn() },
    });
    const directory = { listActiveMemberships: jest.fn() };
    const service = new ReferralCodeService(
      prisma as never,
      directory as never,
      programs() as never,
    );

    await expect(service.attach('org-target', 'IMD-XXXXXX')).rejects.toMatchObject({
      code: 'REFERRALS.PARTNER_NOT_FOUND',
    });
    expect(prisma.referrals.create).not.toHaveBeenCalled();
  });

  it('422 SELF_REFERRAL si la cible est la propre organisation du partenaire', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: { create: jest.fn() },
    });
    const directory = { listActiveMemberships: jest.fn().mockResolvedValue([]) };
    const service = new ReferralCodeService(
      prisma as never,
      directory as never,
      programs() as never,
    );

    await expect(service.attach('own-org', partner.partner_code)).rejects.toMatchObject({
      code: 'REFERRALS.SELF_REFERRAL',
      status: 422,
    });
    expect(prisma.referrals.create).not.toHaveBeenCalled();
  });

  it('422 SELF_REFERRAL si le partenaire est déjà membre de la cible', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: { create: jest.fn() },
    });
    const directory = {
      listActiveMemberships: jest.fn().mockResolvedValue([{ organizationId: 'org-target' }]),
    };
    const service = new ReferralCodeService(
      prisma as never,
      directory as never,
      programs() as never,
    );

    await expect(service.attach('org-target', partner.partner_code)).rejects.toMatchObject({
      code: 'REFERRALS.SELF_REFERRAL',
    });
    expect(prisma.referrals.create).not.toHaveBeenCalled();
  });

  it('409 ALREADY_REFERRED si `referrals_org_uk` est déjà pris', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: {
        create: jest.fn().mockRejectedValue(uniqueViolation('referred_organization_id')),
      },
    });
    const directory = { listActiveMemberships: jest.fn().mockResolvedValue([]) };
    const service = new ReferralCodeService(
      prisma as never,
      directory as never,
      programs() as never,
    );

    await expect(service.attach('org-target', partner.partner_code)).rejects.toMatchObject({
      code: 'REFERRALS.ALREADY_REFERRED',
      status: 409,
    });
  });

  it('rattache normalement quand aucune règle anti-abus ne s’applique', async () => {
    const created = {
      id: 'referral-1',
      partner_id: partner.id,
      referred_organization_id: 'org-target',
      referred_property_id: null,
      source: 'CODE_AT_SIGNUP',
      status: 'PENDING',
      qualified_at: null,
      activated_at: null,
      expires_at: null,
      created_at: new Date(),
    };
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: { create: jest.fn().mockResolvedValue(created) },
    });
    const directory = { listActiveMemberships: jest.fn().mockResolvedValue([]) };
    const service = new ReferralCodeService(
      prisma as never,
      directory as never,
      programs() as never,
    );

    const view = await service.attach('org-target', partner.partner_code);
    expect(view.id).toBe('referral-1');
    expect(prisma.referrals.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: 'CODE_AT_SIGNUP' }) }),
    );
  });
});

describe('ReferralPropertyLeadService.confirm — anti-abus (source PARTNER_REGISTERED_PROPERTY)', () => {
  const partner = { id: 'partner-1', user_id: 'partner-user', organization_id: 'own-org' };

  function otpVerifying(phone = '+242066000002') {
    return {
      verify: jest.fn().mockResolvedValue({ partnerUserId: 'partner-user', phone }),
      request: jest.fn(),
    };
  }

  it('REFERRALS.NOT_FOUND si aucun bailleur self ne correspond au numéro', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: { create: jest.fn() },
    });
    const directory = {
      findSelfLandlordOrganizationByPhone: jest.fn().mockResolvedValue(null),
      listActiveMemberships: jest.fn(),
    };
    const service = new ReferralPropertyLeadService(
      prisma as never,
      directory as never,
      otpVerifying() as never,
      programs() as never,
    );

    await expect(service.confirm('otp-1', '123456')).rejects.toMatchObject({
      code: 'REFERRALS.NOT_FOUND',
    });
    expect(prisma.referrals.create).not.toHaveBeenCalled();
  });

  it('422 SELF_REFERRAL si le bailleur trouvé EST la propre organisation du partenaire', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: { create: jest.fn() },
    });
    const directory = {
      findSelfLandlordOrganizationByPhone: jest.fn().mockResolvedValue('own-org'),
      listActiveMemberships: jest.fn().mockResolvedValue([]),
    };
    const service = new ReferralPropertyLeadService(
      prisma as never,
      directory as never,
      otpVerifying() as never,
      programs() as never,
    );

    await expect(service.confirm('otp-1', '123456')).rejects.toMatchObject({
      code: 'REFERRALS.SELF_REFERRAL',
    });
    expect(prisma.referrals.create).not.toHaveBeenCalled();
  });

  it('409 ALREADY_REFERRED si l’organisation trouvée a déjà un parrain', async () => {
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: {
        create: jest.fn().mockRejectedValue(uniqueViolation('referred_organization_id')),
      },
    });
    const directory = {
      findSelfLandlordOrganizationByPhone: jest.fn().mockResolvedValue('landlord-org'),
      listActiveMemberships: jest.fn().mockResolvedValue([]),
    };
    const service = new ReferralPropertyLeadService(
      prisma as never,
      directory as never,
      otpVerifying() as never,
      programs() as never,
    );

    await expect(service.confirm('otp-1', '123456')).rejects.toMatchObject({
      code: 'REFERRALS.ALREADY_REFERRED',
    });
  });

  it('crée le referral PENDING, source PARTNER_REGISTERED_PROPERTY, confirmed_by_otp_at renseigné', async () => {
    const created = {
      id: 'referral-2',
      partner_id: partner.id,
      referred_organization_id: 'landlord-org',
      referred_property_id: null,
      source: 'PARTNER_REGISTERED_PROPERTY',
      status: 'PENDING',
      qualified_at: null,
      activated_at: null,
      expires_at: null,
      created_at: new Date(),
    };
    const prisma = fakePrisma({
      referral_partners: { findUnique: jest.fn().mockResolvedValue(partner) },
      referrals: { create: jest.fn().mockResolvedValue(created) },
    });
    const directory = {
      findSelfLandlordOrganizationByPhone: jest.fn().mockResolvedValue('landlord-org'),
      listActiveMemberships: jest.fn().mockResolvedValue([]),
    };
    const service = new ReferralPropertyLeadService(
      prisma as never,
      directory as never,
      otpVerifying() as never,
      programs() as never,
    );

    const view = await service.confirm('otp-1', '123456');
    expect(view.source).toBe('PARTNER_REGISTERED_PROPERTY');
    expect(prisma.referrals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'PARTNER_REGISTERED_PROPERTY',
          confirmed_by_otp_at: expect.any(Date),
        }),
      }),
    );
  });
});
