import { v7 as uuidv7 } from 'uuid';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import {
  addMember,
  createAgency,
  dropOrganization,
  firstOfMonth,
  isoDate,
  pollRun,
  seedLeases,
  type Agency,
  type BulkPortfolio,
} from './phase3-fixtures';
import { createProofDocument, ensureOrgBankAccount, momoMsisdn } from './phase4-fixtures';

describe('Phase 4 — déclarations Mobile Money et virement', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let accountant: { accessToken: string; userId: string };
  let collector: { accessToken: string; userId: string };
  let bankAccountId: string;
  const invoiceOf = new Map<string, string>();
  const owner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const as = (token: string) => ({ accessToken: token, organizationId: agency.organizationId });

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Declare');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    bankAccountId = await ensureOrgBankAccount(ctx, agency.organizationId);
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 8, {
      startDate: firstOfMonth(0),
    });
    const run = await api(ctx, 'POST', '/billing/runs', {
      ...owner(),
      body: { periodStart: firstOfMonth(0) },
    });
    await pollRun(ctx, agency, run.body.runId);
    const invoices = await ctx.admin.rent_invoices.findMany({
      where: { organization_id: agency.organizationId },
    });
    for (const invoice of invoices) invoiceOf.set(invoice.tenant_id, invoice.id);
  }, 120_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  const tenant = (i: number) => portfolio.leases[i].tenantId;

  describe('Mobile Money déclaré', () => {
    it('cycle complet : déclaration DECLARED puis validation → paiement CONFIRMED et quittance', async () => {
      const invoiceId = invoiceOf.get(tenant(0)) as string;
      const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
      const declared = await api(ctx, 'POST', '/payments/mobile-money/declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(0),
          invoiceId,
          provider: 'MTN_MOMO',
          operatorReference: `MP${Date.now()}`,
          payerMsisdn: momoMsisdn('01'),
          payeeMsisdn: momoMsisdn('99'),
          amount: Number(invoice.total_amount),
          clientRef: uuidv7(),
        },
      });
      expect(declared.status).toBe(201);
      expect(declared.body.status).toBe('DECLARED');

      const approved = await api(
        ctx,
        'POST',
        `/payments/mobile-money/declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: {},
        },
      );
      expect(approved.status).toBe(200);
      expect(approved.body.transaction.status).toBe('SUCCEEDED');
      expect(approved.body.payment).toMatchObject({
        status: 'CONFIRMED',
        method: 'MOBILE_MONEY',
        feeAmount: 0,
      });

      const receipts = await ctx.admin.receipts.count({
        where: { payment_id: approved.body.payment.id },
      });
      expect(receipts).toBeGreaterThan(0);
    });

    it('une référence opérateur déjà utilisée est rejetée : 409 MOMO.REFERENCE_ALREADY_USED', async () => {
      const reference = `MP-DUP-${Date.now()}`;
      const first = await api(ctx, 'POST', '/payments/mobile-money/declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(1),
          provider: 'MTN_MOMO',
          operatorReference: reference,
          payerMsisdn: momoMsisdn('01'),
          payeeMsisdn: momoMsisdn('99'),
          amount: 20_000,
          clientRef: uuidv7(),
        },
      });
      expect(first.status).toBe(201);

      const second = await api(ctx, 'POST', '/payments/mobile-money/declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(2),
          provider: 'MTN_MOMO',
          operatorReference: reference,
          payerMsisdn: momoMsisdn('01'),
          payeeMsisdn: momoMsisdn('99'),
          amount: 20_000,
          clientRef: uuidv7(),
        },
      });
      expect(second.status).toBe(409);
      expect(second.body.code).toBe('MOMO.REFERENCE_ALREADY_USED');
    });

    it('rejet : REJECTED, aucun paiement créé', async () => {
      const declared = await api(ctx, 'POST', '/payments/mobile-money/declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(3),
          provider: 'AIRTEL_MONEY',
          operatorReference: `MP-REJ-${Date.now()}`,
          payerMsisdn: momoMsisdn('01'),
          payeeMsisdn: momoMsisdn('99'),
          amount: 15_000,
          clientRef: uuidv7(),
        },
      });
      const rejected = await api(
        ctx,
        'POST',
        `/payments/mobile-money/declarations/${declared.body.id}/reject`,
        {
          ...as(accountant.accessToken),
          body: { reason: 'Référence introuvable sur le relevé opérateur.' },
        },
      );
      expect(rejected.status).toBe(200);
      expect(rejected.body.status).toBe('REJECTED');
      const paymentCount = await ctx.admin.mobile_money_transactions.findUnique({
        where: { id: declared.body.id },
      });
      expect(paymentCount?.payment_id).toBeNull();
    });

    it('montant validé différent sans motif : 422 MOMO.APPROVED_AMOUNT_REASON_REQUIRED', async () => {
      const declared = await api(ctx, 'POST', '/payments/mobile-money/declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(4),
          provider: 'MTN_MOMO',
          operatorReference: `MP-AMT-${Date.now()}`,
          payerMsisdn: momoMsisdn('01'),
          payeeMsisdn: momoMsisdn('99'),
          amount: 30_000,
          clientRef: uuidv7(),
        },
      });
      const withoutReason = await api(
        ctx,
        'POST',
        `/payments/mobile-money/declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: { approvedAmount: 25_000 },
        },
      );
      expect(withoutReason.status).toBe(422);
      expect(withoutReason.body.code).toBe('MOMO.APPROVED_AMOUNT_REASON_REQUIRED');

      const withReason = await api(
        ctx,
        'POST',
        `/payments/mobile-money/declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: { approvedAmount: 25_000, reason: 'Écart constaté au relevé opérateur.' },
        },
      );
      expect(withReason.status).toBe(200);
      expect(withReason.body.payment.amount).toBe(25_000);
    });

    it('montant validé inchangé sans motif : accepté', async () => {
      const declared = await api(ctx, 'POST', '/payments/mobile-money/declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(5),
          provider: 'MTN_MOMO',
          operatorReference: `MP-SAME-${Date.now()}`,
          payerMsisdn: momoMsisdn('01'),
          payeeMsisdn: momoMsisdn('99'),
          amount: 30_000,
          clientRef: uuidv7(),
        },
      });
      const approved = await api(
        ctx,
        'POST',
        `/payments/mobile-money/declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: { approvedAmount: 30_000 },
        },
      );
      expect(approved.status).toBe(200);
    });
  });

  describe('Virement déclaré', () => {
    it('cycle complet : SUBMITTED → APPROVED (confirmOnApproval par défaut) → paiement CONFIRMED', async () => {
      const proofId = await createProofDocument(ctx, agency.organizationId, `checksum-${uuidv7()}`);
      const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(6),
          declaredAmount: 160_000,
          transferDate: isoDate(-1),
          payerName: 'Jean Mabiala',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: proofId,
          clientRef: uuidv7(),
        },
      });
      expect(declared.status).toBe(201);
      expect(declared.body.status).toBe('SUBMITTED');
      expect(declared.body.ageHours).toBeGreaterThanOrEqual(0);

      const reviewed = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/review`,
        as(accountant.accessToken),
      );
      expect(reviewed.status).toBe(200);
      expect(reviewed.body.status).toBe('UNDER_REVIEW');

      const approved = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: {},
        },
      );
      expect(approved.status).toBe(200);
      expect(approved.body.payment.status).toBe('CONFIRMED');
      const receipts = await ctx.admin.receipts.count({
        where: { payment_id: approved.body.payment.id },
      });
      expect(receipts).toBeGreaterThan(0);
    });

    it('confirmOnApproval = false : le paiement naît PENDING_VERIFICATION, non alloué', async () => {
      const patched = await api(
        ctx,
        'PATCH',
        `/organizations/${agency.organizationId}/payment-methods`,
        {
          ...owner(),
          body: { bankTransfer: { confirmOnApproval: false } },
        },
      );
      expect(patched.status).toBe(200);

      const proofId = await createProofDocument(ctx, agency.organizationId, `checksum-${uuidv7()}`);
      const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(7),
          declaredAmount: 90_000,
          transferDate: isoDate(-1),
          payerName: 'Alphonse Ngoma',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: proofId,
          clientRef: uuidv7(),
        },
      });
      const approved = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: {},
        },
      );
      expect(approved.body.payment.status).toBe('PENDING_VERIFICATION');
      expect(approved.body.payment.allocatedAmount).toBe(0);

      await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/payment-methods`, {
        ...owner(),
        body: { bankTransfer: { confirmOnApproval: true } },
      });
    });

    it('la même preuve ne sert qu’une fois : 409 BANK.PROOF_ALREADY_USED', async () => {
      const checksum = `checksum-reused-${uuidv7()}`;
      const proofId = await createProofDocument(ctx, agency.organizationId, checksum);
      const first = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(0),
          declaredAmount: 50_000,
          transferDate: isoDate(-1),
          payerName: 'Locataire',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: proofId,
          clientRef: uuidv7(),
        },
      });
      expect(first.status).toBe(201);

      const secondProofId = await createProofDocument(ctx, agency.organizationId, checksum);
      const second = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(1),
          declaredAmount: 50_000,
          transferDate: isoDate(-1),
          payerName: 'Locataire',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: secondProofId,
          clientRef: uuidv7(),
        },
      });
      expect(second.status).toBe(409);
      expect(second.body.code).toBe('BANK.PROOF_ALREADY_USED');
    });

    it('rejet : REJECTED, aucun paiement créé', async () => {
      const proofId = await createProofDocument(ctx, agency.organizationId, `checksum-${uuidv7()}`);
      const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(2),
          declaredAmount: 70_000,
          transferDate: isoDate(-1),
          payerName: 'Locataire',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: proofId,
          clientRef: uuidv7(),
        },
      });
      const rejected = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/reject`,
        {
          ...as(accountant.accessToken),
          body: { reason: 'Montant non reçu.' },
        },
      );
      expect(rejected.status).toBe(200);
      expect(rejected.body.status).toBe('REJECTED');
      expect(rejected.body.paymentId).toBeNull();
    });

    it('montant validé différent sans motif : 422 BANK.APPROVED_AMOUNT_REASON_REQUIRED', async () => {
      const proofId = await createProofDocument(ctx, agency.organizationId, `checksum-${uuidv7()}`);
      const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(3),
          declaredAmount: 80_000,
          transferDate: isoDate(-1),
          payerName: 'Locataire',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: proofId,
          clientRef: uuidv7(),
        },
      });
      const withoutReason = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: { approvedAmount: 75_000 },
        },
      );
      expect(withoutReason.status).toBe(422);
      expect(withoutReason.body.code).toBe('BANK.APPROVED_AMOUNT_REASON_REQUIRED');

      const withReason = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/approve`,
        {
          ...as(accountant.accessToken),
          body: { approvedAmount: 75_000, reason: 'Frais bancaires déduits.' },
        },
      );
      expect(withReason.status).toBe(200);
    });

    it('retrait par le déclarant : CANCELLED', async () => {
      const proofId = await createProofDocument(ctx, agency.organizationId, `checksum-${uuidv7()}`);
      const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
        ...as(collector.accessToken),
        body: {
          tenantId: tenant(4),
          declaredAmount: 40_000,
          transferDate: isoDate(-1),
          payerName: 'Locataire',
          beneficiaryBankAccountId: bankAccountId,
          proofDocumentId: proofId,
          clientRef: uuidv7(),
        },
      });
      const cancelled = await api(
        ctx,
        'POST',
        `/bank-transfer-declarations/${declared.body.id}/cancel`,
        {
          ...as(collector.accessToken),
          body: { reason: 'Virement finalement annulé par le locataire.' },
        },
      );
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.status).toBe('CANCELLED');
    });

    it('instructions de paiement : référence, comptes bancaires et numéros Mobile Money', async () => {
      const invoiceId = invoiceOf.get(tenant(0)) as string;
      const res = await api(
        ctx,
        'GET',
        `/invoices/${invoiceId}/payment-instructions`,
        as(collector.accessToken),
      );
      expect(res.status).toBe(200);
      expect(res.body.transferReference).toBeTruthy();
      expect(Array.isArray(res.body.bankAccounts)).toBe(true);
      expect(typeof res.body.aggregatorAvailable).toBe('boolean');
    });
  });
});
