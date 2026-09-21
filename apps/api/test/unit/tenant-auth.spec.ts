import { TenantAuthService } from '../../src/modules/tenant-auth/application/tenant-auth.service';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base) :
 * `TenantAuthService` est instancié directement par `new`, comme les
 * services de `tenant-portal.spec.ts` — ses dépendances (`OtpAuthService`,
 * `TenantDirectoryService`, `PrismaService`, `AuditService`,
 * `FeatureFlagsService`) sont toutes bouchonnées. Le comportement bout en
 * bout (base réelle, envoi OTP) est couvert par
 * `test/integration/phase10-tenant-portal.int-spec.ts`.
 */
function buildService(overrides: {
  matches?: Array<{ tenantId: string; organizationId: string; userId: string | null }>;
  flagEnabled?: boolean;
  requestOtp?: jest.Mock;
  verifyOtp?: jest.Mock;
}) {
  const matches = overrides.matches ?? [
    { tenantId: 'tenant-1', organizationId: 'org-1', userId: null },
  ];
  const otp = {
    requestOtp:
      overrides.requestOtp ??
      jest.fn().mockResolvedValue({
        requestId: 'req-1',
        channel: 'WHATSAPP',
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
      }),
    verifyOtp:
      overrides.verifyOtp ??
      jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresInSeconds: 900,
        userId: 'user-1',
        isNewUser: true,
      }),
  };
  const directory = {
    findTenantsWithActiveLeaseByPhone: jest.fn().mockResolvedValue(matches),
    listActiveTenantLeases: jest
      .fn()
      .mockResolvedValue([{ leaseId: 'lease-1', organizationId: 'org-1', tenantId: 'tenant-1' }]),
  };
  const tx = {
    tenants: {
      update: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        party_type: 'INDIVIDUAL',
        first_name: 'Bernadette',
        last_name: 'Loemba',
        company_name: null,
      }),
    },
  };
  const prisma = {
    withTenant: jest.fn((_org: string, _user: string, fn: (tx: unknown) => unknown) => fn(tx)),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const featureFlags = {
    listForOrganization: jest
      .fn()
      .mockResolvedValue({ TENANT_PORTAL: overrides.flagEnabled ?? true }),
  };
  const service = new TenantAuthService(
    otp as never,
    directory as never,
    prisma as never,
    audit as never,
    featureFlags as never,
  );
  return { service, otp, directory, tx, audit, featureFlags };
}

describe('TenantAuthService.requestOtp', () => {
  it('refuse sans fiche locataire à bail actif pour ce numéro (403)', async () => {
    const { service, otp } = buildService({ matches: [] });
    await expect(service.requestOtp('+242066000001', 'WHATSAPP', null)).rejects.toMatchObject({
      code: 'PARTIES.PORTAL_NO_ACTIVE_LEASE',
      status: 403,
    });
    expect(otp.requestOtp).not.toHaveBeenCalled();
  });

  it("refuse si aucune organisation n'a activé le portail (403)", async () => {
    const { service, otp } = buildService({ flagEnabled: false });
    await expect(service.requestOtp('+242066000001', 'WHATSAPP', null)).rejects.toMatchObject({
      code: 'PARTIES.PORTAL_NOT_ENABLED',
      status: 403,
    });
    expect(otp.requestOtp).not.toHaveBeenCalled();
  });

  it('délègue à OtpAuthService et traduit sa réponse (202 { expiresAt, resendAfter })', async () => {
    const { service } = buildService({});
    const result = await service.requestOtp('+242066000001', 'WHATSAPP', '1.2.3.4');
    expect(result.resendAfter).toBe(60);
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('TenantAuthService.verifyOtp', () => {
  it('lie la fiche locataire non encore liée et renvoie { accessToken, tenant }', async () => {
    const { service, tx, audit } = buildService({});
    const result = await service.verifyOtp('+242066000001', '123456', {});
    expect(tx.tenants.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { user_id: 'user-1' },
    });
    expect(audit.record).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'access-token',
      tenant: { id: 'tenant-1', displayName: 'Bernadette Loemba', leaseCount: 1 },
    });
  });

  it('ne relie pas une fiche déjà liée (reconnexion)', async () => {
    const { service, tx } = buildService({
      matches: [{ tenantId: 'tenant-1', organizationId: 'org-1', userId: 'user-1' }],
    });
    await service.verifyOtp('+242066000001', '123456', {});
    expect(tx.tenants.update).not.toHaveBeenCalled();
  });
});
