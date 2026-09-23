import { OtpAuthService } from '../../src/modules/identity/application/otp-auth.service';

/**
 * `OtpAuthService.requestSensitiveActionOtp` : code de confirmation pour
 * action sensible (en-tête `X-Otp-Code` de la révocation globale
 * d'organisation). Tests unitaires purs, aucune base ni Redis — les
 * dépendances sont des doubles minimaux.
 */

const USER_ID = 'u-1';
const PHONE = '+242066000001';

function fakeDeps(overrides: { lastCreatedAt?: Date | null; organizationId?: string | null } = {}) {
  const created: Array<Record<string, unknown>> = [];
  const invalidated: Array<Record<string, unknown>> = [];
  const enqueued: Array<Record<string, unknown>> = [];

  const prisma = {
    users: {
      findUnique: jest.fn().mockResolvedValue({ id: USER_ID, phone_e164: PHONE }),
    },
    otp_codes: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          overrides.lastCreatedAt === undefined || overrides.lastCreatedAt === null
            ? null
            : { created_at: overrides.lastCreatedAt },
        ),
      updateMany: jest.fn((args: Record<string, unknown>) => {
        invalidated.push(args);
        return Promise.resolve({ count: 1 });
      }),
      create: jest.fn((args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        return Promise.resolve(args.data);
      }),
    },
  };

  const notifier = {
    enqueue: jest.fn((args: Record<string, unknown>) => {
      enqueued.push(args);
      return Promise.resolve();
    }),
  };

  const config = {
    OTP_CODE_LENGTH: 6,
    OTP_TTL_SECONDS: 300,
    OTP_MAX_ATTEMPTS: 5,
    OTP_RESEND_AFTER_SECONDS: 60,
    OTP_PEPPER: 'poivre-de-test',
  };

  const service = new OtpAuthService(
    prisma as never,
    {} as never,
    notifier as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    config as never,
  );
  // `resolveTraceOrganization` est privée et interroge la base : on la
  // remplace, seul son résultat compte ici (pipeline tracé ou envoi direct).
  (service as unknown as Record<string, unknown>).resolveTraceOrganization = jest
    .fn()
    .mockResolvedValue(overrides.organizationId ?? 'org-1');

  return { service, prisma, notifier, created, invalidated, enqueued };
}

describe('Demande de code pour action sensible', () => {
  it('écrit un code de motif SENSITIVE_ACTION, jamais LOGIN', async () => {
    const { service, created } = fakeDeps();
    await service.requestSensitiveActionOtp(USER_ID);
    expect(created).toHaveLength(1);
    expect(created[0]?.purpose).toBe('SENSITIVE_ACTION');
  });

  it("prend le numéro sur le compte connecté et jamais sur l'appelant", async () => {
    const { service, prisma, created } = fakeDeps();
    await service.requestSensitiveActionOtp(USER_ID);
    // La signature n'accepte aucun numéro : faire envoyer un code d'action
    // sensible au téléphone d'un tiers doit être impossible par construction.
    expect(prisma.users.findUnique).toHaveBeenCalled();
    expect(created[0]?.phone_e164).toBe(PHONE);
    expect(created[0]?.user_id).toBe(USER_ID);
  });

  it('ne stocke jamais le code en clair', async () => {
    const { service, created } = fakeDeps();
    await service.requestSensitiveActionOtp(USER_ID);
    const row = created[0] ?? {};
    expect(row.code_hash).toEqual(expect.any(String));
    expect(Object.keys(row)).not.toContain('code');
    expect(String(row.code_hash)).not.toMatch(/^\d{6}$/);
  });

  it('invalide les codes encore vivants du même motif', async () => {
    const { service, invalidated } = fakeDeps();
    await service.requestSensitiveActionOtp(USER_ID);
    expect(invalidated).toHaveLength(1);
    const where = (invalidated[0] as { where: Record<string, unknown> }).where;
    expect(where.purpose).toBe('SENSITIVE_ACTION');
    expect(where.consumed_at).toBeNull();
  });

  it('refuse une demande trop rapprochée', async () => {
    const { service } = fakeDeps({ lastCreatedAt: new Date() });
    await expect(service.requestSensitiveActionOtp(USER_ID)).rejects.toMatchObject({
      code: 'IAM.OTP_RESEND_TOO_SOON',
    });
  });

  it('passe par le pipeline tracé quand une organisation est connue', async () => {
    const { service, enqueued } = fakeDeps({ organizationId: 'org-1' });
    await service.requestSensitiveActionOtp(USER_ID);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]?.organizationId).toBe('org-1');
  });
});
