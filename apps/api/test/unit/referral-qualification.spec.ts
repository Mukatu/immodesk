import { ReferralQualificationService } from '../../src/modules/referral/application/referral-qualification.service';
import type { ActiveProgram } from '../../src/modules/referral/application/referral-programs.service';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base) : le point
 * d'intégration `onSubscriptionInvoicePaid` (docs/api/phase10-contract.md,
 * § Apport d'affaires, arbitrages 6 et 7 — qualification sur encaissement
 * réel, idempotence, expiration, contre-passation). Comportement bout en
 * bout (base réelle) couvert par `test/integration/phase10-referral.int-spec.ts`.
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

/**
 * `ReferralQualificationService` accède `referrals`/`referral_commissions`/
 * `referral_partners` via `PrismaService.withAdmin` (BYPASSRLS, jamais
 * directement — voir sa docstring). Le faux client exécute `fn` avec le même
 * délégué que l'appelant contrôle, pour que les assertions existantes
 * (`prisma.referrals.update`, etc.) restent valables telles quelles.
 */
function fakePrisma(overrides: Record<string, unknown> = {}) {
  const base = {
    referrals: { findUnique: jest.fn(), update: jest.fn() },
    referral_commissions: { findFirst: jest.fn(), create: jest.fn() },
    referral_partners: { update: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
  const tables = { ...base, ...overrides };
  return { ...tables, withAdmin: jest.fn((fn: (tx: unknown) => unknown) => fn(tables)) };
}

function fakePrograms(program: ActiveProgram = PROGRAM) {
  return {
    getById: jest.fn().mockResolvedValue(program),
    getActiveDefault: jest.fn().mockResolvedValue(program),
  };
}

describe('ReferralQualificationService.onSubscriptionInvoicePaid', () => {
  it("ne fait rien si l'organisation n'est pas parrainée", async () => {
    const prisma = fakePrisma({
      referrals: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);

    await service.onSubscriptionInvoicePaid({
      invoiceId: 'inv-1',
      organizationId: 'org-1',
      subtotalAmount: 10_000n,
      paidAt: new Date('2026-09-20T00:00:00.000Z'),
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('ne fait rien pour un parrainage CANCELLED', async () => {
    const prisma = fakePrisma({
      referrals: {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1', status: 'CANCELLED' }),
        update: jest.fn(),
      },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);
    await service.onSubscriptionInvoicePaid({
      invoiceId: 'inv-1',
      organizationId: 'org-1',
      subtotalAmount: 10_000n,
      paidAt: new Date(),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('idempotent : une commission déjà constatée pour la facture ne se recrée pas', async () => {
    const prisma = fakePrisma({
      referrals: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'r1',
          status: 'ACTIVE',
          partner_id: 'p1',
          program_id: 'program-1',
        }),
        update: jest.fn(),
      },
      referral_commissions: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-commission' }),
        create: jest.fn(),
      },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);
    await service.onSubscriptionInvoicePaid({
      invoiceId: 'inv-1',
      organizationId: 'org-1',
      subtotalAmount: 10_000n,
      paidAt: new Date(),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('premier encaissement : PENDING passe ACTIVE et constate une commission ACCRUED', async () => {
    const referral = {
      id: 'r1',
      status: 'PENDING',
      partner_id: 'p1',
      program_id: 'program-1',
      qualified_at: null,
      activated_at: null,
      expires_at: null,
    };
    const prisma = fakePrisma({
      referrals: { findUnique: jest.fn().mockResolvedValue(referral), update: jest.fn() },
      referral_commissions: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      referral_partners: { update: jest.fn() },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);
    const paidAt = new Date('2026-09-20T00:00:00.000Z');

    await service.onSubscriptionInvoicePaid({
      invoiceId: 'inv-1',
      organizationId: 'org-1',
      subtotalAmount: 10_000n,
      paidAt,
    });

    expect(prisma.referrals.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({ status: 'ACTIVE', qualified_at: paidAt }),
      }),
    );
    expect(prisma.referral_commissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referral_id: 'r1',
          partner_id: 'p1',
          subscription_invoice_id: 'inv-1',
          commission_amount: 2000n, // 10000 * 2000bps / 10000
          status: 'ACCRUED',
        }),
      }),
    );
    expect(prisma.referral_partners.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { total_accrued_amount: { increment: 2000n } },
      }),
    );
  });

  it('hors fenêtre de commissionnement : marque EXPIRED, ne constate aucune commission', async () => {
    const referral = {
      id: 'r1',
      status: 'ACTIVE',
      partner_id: 'p1',
      program_id: 'program-1',
      qualified_at: new Date('2025-01-01T00:00:00.000Z'),
      activated_at: new Date('2025-01-01T00:00:00.000Z'),
      expires_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    const prisma = fakePrisma({
      referrals: { findUnique: jest.fn().mockResolvedValue(referral), update: jest.fn() },
      referral_commissions: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);

    await service.onSubscriptionInvoicePaid({
      invoiceId: 'inv-2',
      organizationId: 'org-1',
      subtotalAmount: 10_000n,
      paidAt: new Date('2026-09-20T00:00:00.000Z'), // après expires_at
    });

    expect(prisma.referrals.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'EXPIRED' },
    });
    expect(prisma.referral_commissions.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('ReferralQualificationService.reverseCommissionForInvoice (contre-passation, arbitrage 7)', () => {
  const original = {
    id: 'commission-1',
    referral_id: 'r1',
    partner_id: 'p1',
    subscription_invoice_id: 'inv-1',
    base_amount: 10_000n,
    rate_bps: 2000,
    commission_amount: 2000n,
    currency: 'XAF',
    period_month: new Date('2026-09-01T00:00:00.000Z'),
  };

  it('crée une NOUVELLE ligne REVERSED, ne modifie jamais la ligne originale', async () => {
    const prisma = fakePrisma({
      referral_commissions: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(original) // recherche de la commission d'origine
          .mockResolvedValueOnce(null), // pas déjà contre-passée
        create: jest.fn(),
      },
      referral_partners: { update: jest.fn() },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);

    await service.reverseCommissionForInvoice('inv-1', 'Facture remboursée');

    expect(prisma.referral_commissions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REVERSED',
          reversal_of_id: 'commission-1',
          commission_amount: 2000n,
          reason: 'Facture remboursée',
        }),
      }),
    );
    expect(prisma.referral_partners.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { total_accrued_amount: { decrement: 2000n } } }),
    );
  });

  it('idempotent : une commission déjà contre-passée ne se recontre-passe pas', async () => {
    const prisma = fakePrisma({
      referral_commissions: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(original)
          .mockResolvedValueOnce({ id: 'already-reversed' }),
        create: jest.fn(),
      },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);
    await service.reverseCommissionForInvoice('inv-1', 'Doublon');
    expect(prisma.referral_commissions.create).not.toHaveBeenCalled();
  });

  it('sans commission originale, ne fait rien', async () => {
    const prisma = fakePrisma({
      referral_commissions: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
    });
    const service = new ReferralQualificationService(prisma as never, fakePrograms() as never);
    await service.reverseCommissionForInvoice('inv-inconnue', 'x');
    expect(prisma.referral_commissions.create).not.toHaveBeenCalled();
  });
});
