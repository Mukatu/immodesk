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
import { ensureOrgBankAccount } from './phase4-fixtures';

describe('Phase 6 — chèques (lot 2)', () => {
  let ctx: TestContext;
  let agency: Agency;
  let portfolio: BulkPortfolio;
  let accountant: { accessToken: string; userId: string };
  let bankAccountId: string;
  const invoiceOf = new Map<string, string>();
  const owner = () => ({
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
  });
  const as = (token: string) => ({ accessToken: token, organizationId: agency.organizationId });
  const tenant = (i: number) => portfolio.leases[i].tenantId;
  const lease = (i: number) => portfolio.leases[i].leaseId;
  const checkNumber = (suffix: string) => `CHK-${Date.now()}-${suffix}`;

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Checks');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    bankAccountId = await ensureOrgBankAccount(ctx, agency.organizationId);
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 6, {
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
    // `bank_checks.lease_id`/`tenant_id` sont ON DELETE RESTRICT : nettoyage
    // avant `dropOrganization`, qui ignore cette table (module ajouté après
    // l'écriture de `phase3-fixtures.ts`).
    await ctx.admin
      .$executeRawUnsafe(
        `DELETE FROM bank_checks WHERE organization_id = $1::uuid`,
        agency.organizationId,
      )
      .catch(() => undefined);
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('cycle complet : réception → dépôt → compensation, paiement confirmé et quittance', async () => {
    const invoiceId = invoiceOf.get(tenant(0)) as string;
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(0),
        leaseId: lease(0),
        invoiceId,
        checkNumber: checkNumber('A'),
        drawerName: 'Jean Mabiala',
        drawerBankCode: 'BGFI',
        drawerBankName: 'BGFIBank Congo',
        amount: Number(invoice.total_amount),
        issueDate: isoDate(-3),
      },
    });
    expect(received.status).toBe(201);
    expect(received.body.status).toBe('RECEIVED');
    expect(received.body.paymentId).toBeTruthy();

    const pending = await ctx.admin.payments.findUnique({
      where: { id: received.body.paymentId },
    });
    expect(pending?.status).toBe('PENDING_VERIFICATION');
    expect(pending?.method).toBe('BANK_CHECK');

    const deposited = await api(ctx, 'POST', `/bank-checks/${received.body.id}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId, depositDate: isoDate(-1) },
    });
    expect(deposited.status).toBe(200);
    expect(deposited.body.status).toBe('DEPOSITED');
    expect(deposited.body.depositBankAccountId).toBe(bankAccountId);

    const cleared = await api(ctx, 'POST', `/bank-checks/${received.body.id}/clear`, {
      ...as(accountant.accessToken),
      body: {},
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body.status).toBe('CLEARED');
    expect(cleared.body.invoice?.id).toBe(invoiceId);
    expect(cleared.body.tenant?.id).toBe(tenant(0));

    const confirmedPayment = await ctx.admin.payments.findUnique({
      where: { id: received.body.paymentId },
    });
    expect(confirmedPayment?.status).toBe('CONFIRMED');

    const receipts = await ctx.admin.receipts.count({
      where: { payment_id: received.body.paymentId },
    });
    expect(receipts).toBeGreaterThan(0);

    const detail = await api(
      ctx,
      'GET',
      `/bank-checks/${received.body.id}`,
      as(accountant.accessToken),
    );
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe('CLEARED');
    expect(Array.isArray(detail.body.matches)).toBe(true);
  });

  it('unicité (organization_id, drawer_bank_code, check_number) : 409 BANK.CHECK_ALREADY_REGISTERED', async () => {
    const number = checkNumber('DUP');
    const first = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(1),
        checkNumber: number,
        drawerName: 'Locataire Un',
        drawerBankCode: 'LCB',
        drawerBankName: 'LCB Bank',
        amount: 20_000,
        issueDate: isoDate(-2),
      },
    });
    expect(first.status).toBe(201);

    const second = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(2),
        checkNumber: number,
        drawerName: 'Locataire Deux',
        drawerBankCode: 'LCB',
        drawerBankName: 'LCB Bank',
        amount: 25_000,
        issueDate: isoDate(-2),
      },
    });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('BANK.CHECK_ALREADY_REGISTERED');

    // Même numéro, banque différente : pas de collision.
    const differentBank = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(2),
        checkNumber: number,
        drawerName: 'Locataire Deux',
        drawerBankCode: 'UBA',
        drawerBankName: 'UBA Congo',
        amount: 25_000,
        issueDate: isoDate(-2),
      },
    });
    expect(differentBank.status).toBe(201);
  });

  it('annulation avant dépôt : RECEIVED → CANCELLED, paiement CANCELLED, dépôt ensuite refusé', async () => {
    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(3),
        checkNumber: checkNumber('CANCEL'),
        drawerName: 'Locataire Trois',
        drawerBankCode: 'UBA',
        drawerBankName: 'UBA Congo',
        amount: 30_000,
        issueDate: isoDate(-1),
      },
    });
    expect(received.status).toBe(201);

    const cancelled = await api(ctx, 'POST', `/bank-checks/${received.body.id}/cancel`, {
      ...as(accountant.accessToken),
      body: { reason: 'Chèque repris par le locataire.' },
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('CANCELLED');

    const payment = await ctx.admin.payments.findUnique({ where: { id: received.body.paymentId } });
    expect(payment?.status).toBe('CANCELLED');

    const invalidDeposit = await api(ctx, 'POST', `/bank-checks/${received.body.id}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId },
    });
    expect(invalidDeposit.status).toBe(409);
    expect(invalidDeposit.body.code).toBe('BANK.CHECK_INVALID_TRANSITION');
  });

  it('chèque rendu au tireur : RECEIVED → RETURNED, paiement CANCELLED', async () => {
    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(3),
        checkNumber: checkNumber('RETURN'),
        drawerName: 'Locataire Trois',
        drawerBankCode: 'BSCA',
        drawerBankName: 'BSCA Bank',
        amount: 15_000,
        issueDate: isoDate(-1),
      },
    });
    const returned = await api(ctx, 'POST', `/bank-checks/${received.body.id}/return`, {
      ...as(accountant.accessToken),
      body: {},
    });
    expect(returned.status).toBe(200);
    expect(returned.body.status).toBe('RETURNED');
    const payment = await ctx.admin.payments.findUnique({ where: { id: received.body.paymentId } });
    expect(payment?.status).toBe('CANCELLED');
  });

  it('motif obligatoire sur le rejet : 422 BANK.CHECK_REASON_REQUIRED', async () => {
    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(4),
        checkNumber: checkNumber('NOREASON'),
        drawerName: 'Locataire Quatre',
        drawerBankCode: 'ECOBANK',
        drawerBankName: 'Ecobank Congo',
        amount: 10_000,
        issueDate: isoDate(-2),
      },
    });
    await api(ctx, 'POST', `/bank-checks/${received.body.id}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId },
    });
    const bounced = await api(ctx, 'POST', `/bank-checks/${received.body.id}/bounce`, {
      ...as(accountant.accessToken),
      body: {},
    });
    expect(bounced.status).toBe(422);
    expect(bounced.body.code).toBe('BANK.CHECK_REASON_REQUIRED');
  });

  it('rejet avant compensation : frais sur la première facture DRAFT suivante, paiement REJECTED', async () => {
    const draft = await api(ctx, 'POST', '/invoices', {
      ...owner(),
      body: {
        leaseId: lease(4),
        periodStart: firstOfMonth(1),
        periodEnd: firstOfMonth(2),
        lines: [{ lineType: 'RENT', label: 'Loyer', unitPriceAmount: 100_000 }],
        issue: false,
      },
    });
    expect(draft.status).toBe(201);
    expect(draft.body.status).toBe('DRAFT');
    const totalBefore = draft.body.totalAmount as number;

    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(4),
        leaseId: lease(4),
        checkNumber: checkNumber('FEE'),
        drawerName: 'Locataire Quatre',
        drawerBankCode: 'LCB',
        drawerBankName: 'LCB Bank',
        amount: 40_000,
        issueDate: isoDate(-4),
      },
    });
    await api(ctx, 'POST', `/bank-checks/${received.body.id}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId, depositDate: isoDate(-2) },
    });

    const bounced = await api(ctx, 'POST', `/bank-checks/${received.body.id}/bounce`, {
      ...as(accountant.accessToken),
      body: { reason: 'Provision insuffisante.', feeAmount: 5_000 },
    });
    expect(bounced.status).toBe(200);
    expect(bounced.body.status).toBe('BOUNCED');
    expect(bounced.body.bounceFeeAmount).toBe(5_000);

    const payment = await ctx.admin.payments.findUnique({ where: { id: received.body.paymentId } });
    expect(payment?.status).toBe('REJECTED');

    const updatedDraft = await ctx.admin.rent_invoices.findUniqueOrThrow({
      where: { id: draft.body.id },
    });
    expect(updatedDraft.status).toBe('DRAFT');
    expect(Number(updatedDraft.total_amount)).toBe(totalBefore + 5_000);

    const currentPeriodInvoice = await ctx.admin.rent_invoices.findUniqueOrThrow({
      where: { id: invoiceOf.get(tenant(4)) as string },
    });
    // La facture de la période courante (déjà émise) n'est jamais modifiée par le rejet.
    expect(currentPeriodInvoice.status).not.toBe('CANCELLED');
  });

  it('aucune facture DRAFT candidate : le rejet réussit quand même', async () => {
    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(1),
        checkNumber: checkNumber('NOFEE'),
        drawerName: 'Locataire Un',
        drawerBankCode: 'BSCA',
        drawerBankName: 'BSCA Bank',
        amount: 12_000,
        issueDate: isoDate(-2),
      },
    });
    await api(ctx, 'POST', `/bank-checks/${received.body.id}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId },
    });
    const bounced = await api(ctx, 'POST', `/bank-checks/${received.body.id}/bounce`, {
      ...as(accountant.accessToken),
      body: { reason: 'Sans provision.', feeAmount: 3_000 },
    });
    expect(bounced.status).toBe(200);
    expect(bounced.body.status).toBe('BOUNCED');
    expect(bounced.body.bounceFeeAmount).toBe(3_000);
  });

  it('rejet après compensation : contre-passation du paiement, facture rouverte, chèque BOUNCED', async () => {
    const invoiceId = invoiceOf.get(tenant(5)) as string;
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(5),
        leaseId: lease(5),
        invoiceId,
        checkNumber: checkNumber('CLEAR-BOUNCE'),
        drawerName: 'Locataire Cinq',
        drawerBankCode: 'BGFI',
        drawerBankName: 'BGFIBank Congo',
        amount: Number(invoice.total_amount),
        issueDate: isoDate(-5),
      },
    });
    await api(ctx, 'POST', `/bank-checks/${received.body.id}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId, depositDate: isoDate(-3) },
    });
    const cleared = await api(ctx, 'POST', `/bank-checks/${received.body.id}/clear`, {
      ...as(accountant.accessToken),
      body: {},
    });
    expect(cleared.status).toBe(200);

    const paidInvoice = await ctx.admin.rent_invoices.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(paidInvoice.status).toBe('PAID');

    const bounced = await api(ctx, 'POST', `/bank-checks/${received.body.id}/bounce`, {
      ...as(accountant.accessToken),
      body: { reason: 'Chèque finalement impayé après compensation.' },
    });
    expect(bounced.status).toBe(200);
    expect(bounced.body.status).toBe('BOUNCED');

    const originalPayment = await ctx.admin.payments.findUnique({
      where: { id: received.body.paymentId },
    });
    // Contre-passation : le paiement d'origine n'est JAMAIS modifié.
    expect(originalPayment?.status).toBe('CONFIRMED');

    const mirror = await ctx.admin.payments.findFirst({
      where: { reversal_of_id: received.body.paymentId as string },
    });
    expect(mirror?.status).toBe('REVERSED');

    const reopenedInvoice = await ctx.admin.rent_invoices.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(['ISSUED', 'OVERDUE']).toContain(reopenedInvoice.status);
  });
});
