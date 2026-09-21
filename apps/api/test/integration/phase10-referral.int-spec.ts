import { ReferralQualificationService } from '../../src/modules/referral/application/referral-qualification.service';
import {
  api,
  login,
  newUuid,
  readOtpCode,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

/**
 * Phase 10 — Apport d'affaires (docs/api/phase10-contract.md, § Apport
 * d'affaires) : inscription partenaire, code de parrainage, enregistrement
 * d'immeuble confirmé par OTP, qualification (point d'intégration
 * `ReferralQualificationService.onSubscriptionInvoicePaid`, appelé
 * directement ici — `SubscriptionsModule` est encore un squelette),
 * approbation et versement, liste des abonnements à risque.
 */
describe('Phase 10 — Apport d’affaires', () => {
  let ctx: TestContext;
  let partner: { accessToken: string; userId: string };
  let landlordOrgId: string;
  let landlordPhone: string;

  beforeAll(async () => {
    ctx = await startTestApp();

    const program = await ctx.admin.referral_programs.upsert({
      where: { code: 'IMD-STD' },
      update: {},
      create: {
        id: newUuid(),
        code: 'IMD-STD',
        name: 'Programme standard (test)',
        rate_bps: 2000,
        duration_months: 12,
        min_payout_amount: 1000n,
        monthly_cap_amount: null,
        is_active: true,
      },
    });
    void program;

    partner = await login(ctx, uniquePhone());

    landlordPhone = uniquePhone();
    const landlordOwner = await login(ctx, landlordPhone);
    const org = await api(ctx, 'POST', '/organizations', {
      accessToken: landlordOwner.accessToken,
      body: {
        type: 'INDEPENDENT_LANDLORD',
        legalName: 'Bailleur Apport Test SARL',
        city: 'Brazzaville',
        contactPhone: landlordPhone,
      },
    });
    expect(org.status).toBe(201);
    landlordOrgId = org.body.id;
  }, 60_000);

  afterAll(async () => {
    await stopTestApp(ctx);
  });

  describe('Inscription partenaire', () => {
    let partnerCode: string;

    it('POST /referral-partners : 201, statut PENDING_VERIFICATION', async () => {
      const res = await api(ctx, 'POST', '/referral-partners', {
        accessToken: partner.accessToken,
        body: { displayName: 'Jean Testeur' },
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING_VERIFICATION');
      expect(res.body.partnerCode).toMatch(/^IMD-[A-Z0-9]{6}$/);
      partnerCode = res.body.partnerCode;
    });

    it('GET /referral-partners/me : reflète le compte créé', async () => {
      const res = await api(ctx, 'GET', '/referral-partners/me', {
        accessToken: partner.accessToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.partnerCode).toBe(partnerCode);
    });

    it('une seconde inscription est refusée : 409 PARTNER_ALREADY_EXISTS', async () => {
      const res = await api(ctx, 'POST', '/referral-partners', {
        accessToken: partner.accessToken,
        body: {},
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('REFERRALS.PARTNER_ALREADY_EXISTS');
    });

    it('GET /referral-partners/me sans inscription : 404 PARTNER_NOT_FOUND', async () => {
      const stranger = await login(ctx, uniquePhone());
      const res = await api(ctx, 'GET', '/referral-partners/me', {
        accessToken: stranger.accessToken,
      });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('REFERRALS.PARTNER_NOT_FOUND');
    });
  });

  describe('Code de parrainage — POST /organizations/{id}/referral-code', () => {
    it('rattache une organisation filleule : 201, source CODE_AT_SIGNUP', async () => {
      const filleul = await login(ctx, uniquePhone());
      const org = await api(ctx, 'POST', '/organizations', {
        accessToken: filleul.accessToken,
        body: {
          type: 'AGENCY',
          legalName: 'Filleule Test SARL',
          city: 'Pointe-Noire',
          contactPhone: uniquePhone(),
        },
      });
      expect(org.status).toBe(201);

      const me = await api(ctx, 'GET', '/referral-partners/me', {
        accessToken: partner.accessToken,
      });
      const attach = await api(ctx, 'POST', `/organizations/${org.body.id}/referral-code`, {
        accessToken: filleul.accessToken,
        organizationId: org.body.id,
        body: { code: me.body.partnerCode },
      });
      expect(attach.status).toBe(201);
      expect(attach.body.source).toBe('CODE_AT_SIGNUP');
      expect(attach.body.status).toBe('PENDING');
      expect(attach.body.referredOrganizationId).toBe(org.body.id);

      const again = await api(ctx, 'POST', `/organizations/${org.body.id}/referral-code`, {
        accessToken: filleul.accessToken,
        organizationId: org.body.id,
        body: { code: me.body.partnerCode },
      });
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('REFERRALS.ALREADY_REFERRED');
    });

    it('code inconnu : 404 PARTNER_NOT_FOUND', async () => {
      const owner = await login(ctx, uniquePhone());
      const org = await api(ctx, 'POST', '/organizations', {
        accessToken: owner.accessToken,
        body: {
          type: 'AGENCY',
          legalName: 'Agence Code Inconnu SARL',
          city: 'Brazzaville',
          contactPhone: uniquePhone(),
        },
      });
      expect(org.status).toBe(201);
      const res = await api(ctx, 'POST', `/organizations/${org.body.id}/referral-code`, {
        accessToken: owner.accessToken,
        organizationId: org.body.id,
        body: { code: 'IMD-000000' },
      });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('REFERRALS.PARTNER_NOT_FOUND');
    });

    it('auto-parrainage (le partenaire est déjà membre de la cible) : 422 SELF_REFERRAL', async () => {
      const me = await api(ctx, 'GET', '/referral-partners/me', {
        accessToken: partner.accessToken,
      });
      const ownOrg = await api(ctx, 'POST', '/organizations', {
        accessToken: partner.accessToken,
        body: {
          type: 'AGENCY',
          legalName: 'Ma propre agence',
          city: 'Brazzaville',
          contactPhone: uniquePhone(),
        },
      });
      expect(ownOrg.status).toBe(201);

      const res = await api(ctx, 'POST', `/organizations/${ownOrg.body.id}/referral-code`, {
        accessToken: partner.accessToken,
        organizationId: ownOrg.body.id,
        body: { code: me.body.partnerCode },
      });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('REFERRALS.SELF_REFERRAL');
    });
  });

  describe('Enregistrement d’immeuble par un partenaire, confirmé par OTP du bailleur', () => {
    it('202 sans aucune ligne créée, puis 201 après confirmation OTP', async () => {
      const before = await ctx.admin.referrals.findUnique({
        where: { referred_organization_id: landlordOrgId },
      });
      expect(before).toBeNull();

      const request = await api(ctx, 'POST', '/referral-partners/me/properties', {
        accessToken: partner.accessToken,
        body: { landlordPhone },
      });
      expect(request.status).toBe(202);
      expect(request.body.id).toBeTruthy();
      expect(request.body.confirmationSentTo).toContain('•');

      const wrongCode = await api(
        ctx,
        'POST',
        `/referral-partners/me/properties/${request.body.id}/confirm-otp`,
        {
          body: { code: '000000' },
        },
      );
      expect(wrongCode.status).toBe(401);

      const code = await readOtpCode(ctx, landlordPhone);
      const confirm = await api(
        ctx,
        'POST',
        `/referral-partners/me/properties/${request.body.id}/confirm-otp`,
        {
          body: { code },
        },
      );
      expect(confirm.status).toBe(201);
      expect(confirm.body.source).toBe('PARTNER_REGISTERED_PROPERTY');
      expect(confirm.body.referredOrganizationId).toBe(landlordOrgId);
      expect(confirm.body.status).toBe('PENDING');
    });

    it('organisation déjà parrainée : une nouvelle demande confirmée renvoie 409 ALREADY_REFERRED', async () => {
      const request = await api(ctx, 'POST', '/referral-partners/me/properties', {
        accessToken: partner.accessToken,
        body: { landlordPhone },
      });
      expect(request.status).toBe(202);
      const code = await readOtpCode(ctx, landlordPhone);
      const confirm = await api(
        ctx,
        'POST',
        `/referral-partners/me/properties/${request.body.id}/confirm-otp`,
        {
          body: { code },
        },
      );
      expect(confirm.status).toBe(409);
      expect(confirm.body.code).toBe('REFERRALS.ALREADY_REFERRED');
    });

    it('aucun bailleur self pour ce numéro : 404 REFERRALS.NOT_FOUND', async () => {
      const unknownPhone = uniquePhone();
      const request = await api(ctx, 'POST', '/referral-partners/me/properties', {
        accessToken: partner.accessToken,
        body: { landlordPhone: unknownPhone },
      });
      expect(request.status).toBe(202);
      const code = await readOtpCode(ctx, unknownPhone);
      const confirm = await api(
        ctx,
        'POST',
        `/referral-partners/me/properties/${request.body.id}/confirm-otp`,
        {
          body: { code },
        },
      );
      expect(confirm.status).toBe(404);
      expect(confirm.body.code).toBe('REFERRALS.NOT_FOUND');
    });
  });

  describe('Qualification (point d’intégration subscriptions) et commissions', () => {
    it('un encaissement PAID qualifie le parrainage et constate une commission ACCRUED', async () => {
      const invoice = await seedPaidInvoice(ctx, landlordOrgId, 100_000n);
      const qualification = ctx.app.get(ReferralQualificationService);

      await qualification.onSubscriptionInvoicePaid({
        invoiceId: invoice.id,
        organizationId: landlordOrgId,
        subtotalAmount: 100_000n,
        paidAt: new Date(),
      });

      const referrals = await api(ctx, 'GET', '/referral-partners/me/referrals', {
        accessToken: partner.accessToken,
      });
      expect(referrals.status).toBe(200);
      const referral = referrals.body.items.find(
        (r: any) => r.referredOrganizationId === landlordOrgId,
      );
      expect(referral).toMatchObject({ status: 'ACTIVE' });
      expect(referral.qualifiedAt).toBeTruthy();

      const commissions = await api(ctx, 'GET', '/referral-partners/me/commissions', {
        accessToken: partner.accessToken,
      });
      expect(commissions.status).toBe(200);
      expect(commissions.body.totals.ACCRUED).toBe('20000'); // 100000 * 2000bps / 10000
      const commission = commissions.body.items.find((c: any) => c.referralId === referral.id);
      expect(commission).toMatchObject({ status: 'ACCRUED', commissionAmount: '20000' });
    }, 30_000);
  });

  describe('Administration plateforme : approbation, versement, abonnements à risque', () => {
    let admin: { accessToken: string };
    let payoutId: string;

    beforeAll(async () => {
      const session = await login(ctx, uniquePhone());
      await ctx.admin.users.update({
        where: { id: session.userId },
        data: { is_platform_admin: true },
      });
      admin = session;
    });

    it('une route /admin/* refuse un appelant non-plateforme (403 IAM.FORBIDDEN)', async () => {
      const res = await api(ctx, 'POST', '/admin/referral-commissions/approve', {
        accessToken: partner.accessToken,
        body: {},
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('IAM.FORBIDDEN');
    });

    it('POST /admin/referral-commissions/approve : ACCRUED -> APPROVED (mois courant)', async () => {
      const res = await api(ctx, 'POST', '/admin/referral-commissions/approve', {
        accessToken: admin.accessToken,
        body: {},
      });
      expect(res.status).toBe(200);
      expect(res.body.approved).toBeGreaterThanOrEqual(1);
      expect(res.body.heldByCap).toBe(0);

      const commissions = await api(ctx, 'GET', '/referral-partners/me/commissions', {
        accessToken: partner.accessToken,
      });
      const approved = commissions.body.items.find((c: any) => c.commissionAmount === '20000');
      expect(approved.status).toBe('APPROVED');
    });

    it('POST /admin/referral-payouts puis GET /admin/referral-payouts/{id}', async () => {
      const me = await api(ctx, 'GET', '/referral-partners/me', {
        accessToken: partner.accessToken,
      });
      const created = await api(ctx, 'POST', '/admin/referral-payouts', {
        accessToken: admin.accessToken,
        body: { partnerId: me.body.id },
      });
      expect(created.status).toBe(202);
      expect(created.body.payoutIds.length).toBe(1);
      payoutId = created.body.payoutIds[0];

      const detail = await api(ctx, 'GET', `/admin/referral-payouts/${payoutId}`, {
        accessToken: admin.accessToken,
      });
      expect(detail.status).toBe(200);
      expect(detail.body.totalAmount).toBe('20000');
      expect(detail.body.status).toBe('PENDING');
    });

    it('GET /admin/subscriptions/at-risk : liste les abonnements PAST_DUE', async () => {
      const owner = await login(ctx, uniquePhone());
      const org = await api(ctx, 'POST', '/organizations', {
        accessToken: owner.accessToken,
        body: {
          type: 'AGENCY',
          legalName: 'À risque SARL',
          city: 'Brazzaville',
          contactPhone: uniquePhone(),
        },
      });
      await seedSubscription(ctx, org.body.id, 'PAST_DUE');

      const res = await api(ctx, 'GET', '/admin/subscriptions/at-risk', {
        accessToken: admin.accessToken,
      });
      expect(res.status).toBe(200);
      expect(
        res.body.items.some(
          (i: any) => i.organizationId === org.body.id && i.status === 'PAST_DUE',
        ),
      ).toBe(true);
    });
  });
});

/** Crée un plan + un abonnement + une facture PAID minimaux (module `subscriptions` pas encore livré). */
async function seedPaidInvoice(
  ctx: TestContext,
  organizationId: string,
  subtotalAmount: bigint,
): Promise<{ id: string }> {
  const { subscriptionId } = await seedSubscription(ctx, organizationId, 'ACTIVE');
  const now = new Date();
  // `subscription_invoices_period_chk` exige period_start < period_end.
  const periodEnd = new Date(now.getTime() + 30 * 86_400_000);
  const invoice = await ctx.admin.subscription_invoices.create({
    data: {
      id: newUuid(),
      organization_id: organizationId,
      subscription_id: subscriptionId,
      invoice_number: `SUB-TEST-${newUuid().slice(0, 8)}`,
      status: 'PAID',
      period_start: now,
      period_end: periodEnd,
      due_date: periodEnd,
      subtotal_amount: subtotalAmount,
      total_amount: subtotalAmount,
      paid_amount: subtotalAmount,
      paid_at: now,
    },
  });
  return { id: invoice.id };
}

async function seedSubscription(
  ctx: TestContext,
  organizationId: string,
  status: 'ACTIVE' | 'PAST_DUE',
): Promise<{ subscriptionId: string }> {
  const plan = await ctx.admin.subscription_plans.upsert({
    where: { code: 'TEST-PLAN' },
    update: {},
    create: { id: newUuid(), code: 'TEST-PLAN', name: 'Plan de test' },
  });
  const subscription = await ctx.admin.subscriptions.upsert({
    where: { organization_id: organizationId },
    update: { status },
    create: {
      id: newUuid(),
      organization_id: organizationId,
      plan_id: plan.id,
      status,
      current_period_end: new Date(Date.now() + 30 * 86_400_000),
    },
  });
  return { subscriptionId: subscription.id };
}
