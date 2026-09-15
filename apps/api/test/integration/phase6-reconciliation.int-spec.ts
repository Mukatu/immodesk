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
import { createProofDocument, ensureOrgBankAccount } from './phase4-fixtures';

function toDdMmYyyy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface CsvLine {
  date: string;
  label: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
}

/** Relevé BGFI minimal (même en-tête que `fixtures/bgfi.csv`), construit pour le test. */
function bgfiCsv(lines: CsvLine[]): Buffer {
  const header = 'Date opération;Date valeur;Libellé;Débit;Crédit;Référence BGFI';
  const rows = lines.map((l) => {
    const day = toDdMmYyyy(l.date);
    const debit = l.direction === 'DEBIT' ? String(l.amount) : '';
    const credit = l.direction === 'CREDIT' ? String(l.amount) : '';
    return `${day};${day};${l.label};${debit};${credit};`;
  });
  return Buffer.from([header, ...rows].join('\n'), 'utf8');
}

/** Cycle réel upload-url → PUT MinIO → enregistrement, comme un vrai client. */
async function uploadStatementDocument(
  ctx: TestContext,
  agency: Agency,
  bankAccountId: string,
  content: Buffer,
  fileName: string,
): Promise<string> {
  const signed = await api(ctx, 'POST', '/documents/upload-url', {
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
    body: {
      fileName,
      mimeType: 'text/csv',
      sizeBytes: content.length,
      kind: 'BANK_STATEMENT',
      relatedEntityType: 'bank_statement',
      relatedEntityId: bankAccountId,
    },
  });
  if (signed.status !== 201)
    throw new Error(`upload-url en échec : ${JSON.stringify(signed.body)}`);
  const put = await fetch(signed.body.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/csv' },
    body: content,
  });
  if (put.status !== 200) throw new Error(`PUT MinIO en échec : ${put.status}`);
  const registered = await api(ctx, 'POST', '/documents', {
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
    body: {
      objectKey: signed.body.objectKey,
      fileName,
      mimeType: 'text/csv',
      sizeBytes: content.length,
      kind: 'BANK_STATEMENT',
      relatedEntityType: 'bank_statement',
      relatedEntityId: bankAccountId,
    },
  });
  if (registered.status !== 201) {
    throw new Error(`registration en échec : ${JSON.stringify(registered.body)}`);
  }
  return registered.body.id;
}

describe('Phase 6 — moteur de rapprochement (lot 3)', () => {
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
  const tenant = (i: number) => portfolio.leases[i].tenantId;
  const lease = (i: number) => portfolio.leases[i].leaseId;

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Reconciliation');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    collector = await addMember(ctx, agency.organizationId, 'COLLECTOR');
    bankAccountId = await ensureOrgBankAccount(ctx, agency.organizationId);
    // 4 baux : EXACT/déclaration (0), SUGGESTED/déclaration (1), manuel+annulation (2),
    // chèque compensé par rapprochement (3).
    portfolio = await seedLeases(ctx.admin, agency.organizationId, 4, {
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
    // Ordre imposé par les FK `ON DELETE RESTRICT` (voir phase6-checks.int-spec.ts) :
    // `reconciliation_matches` avant `bank_statement_lines`, lui-même avant
    // `bank_statements` — tables absentes de `phase3-fixtures.dropOrganization`
    // (module ajouté après son écriture).
    await ctx.admin
      .$executeRawUnsafe(
        `DELETE FROM reconciliation_matches WHERE organization_id = $1::uuid`,
        agency.organizationId,
      )
      .catch(() => undefined);
    await ctx.admin
      .$executeRawUnsafe(
        `DELETE FROM bank_statement_lines WHERE organization_id = $1::uuid`,
        agency.organizationId,
      )
      .catch(() => undefined);
    await ctx.admin
      .$executeRawUnsafe(
        `DELETE FROM bank_statements WHERE organization_id = $1::uuid`,
        agency.organizationId,
      )
      .catch(() => undefined);
    // `bank_checks` : même remarque que `phase6-checks.int-spec.ts`, table
    // absente de `dropOrganization` (module ajouté après son écriture).
    await ctx.admin
      .$executeRawUnsafe(
        `DELETE FROM bank_checks WHERE organization_id = $1::uuid`,
        agency.organizationId,
      )
      .catch(() => undefined);
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
      collector.userId,
    ]);
    await stopTestApp(ctx);
  });

  it('règle EXACT (référence structurée) sur une déclaration en attente : auto-confirmée, paiement CONFIRMED, quittance émise', async () => {
    const invoiceId = invoiceOf.get(tenant(0)) as string;
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
    const proofId = await createProofDocument(
      ctx,
      agency.organizationId,
      `checksum-exact-${uuidv7()}`,
    );

    const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
      ...as(collector.accessToken),
      body: {
        tenantId: tenant(0),
        leaseId: lease(0),
        invoiceId,
        declaredAmount: Number(invoice.total_amount),
        transferDate: isoDate(-1),
        payerName: 'Jean Mabiala',
        beneficiaryBankAccountId: bankAccountId,
        proofDocumentId: proofId,
        clientRef: uuidv7(),
      },
    });
    expect(declared.status).toBe(201);
    expect(declared.body.status).toBe('SUBMITTED');

    const content = bgfiCsv([
      {
        date: isoDate(-1),
        label: `VIR ${invoice.invoice_number} LOYER SEPTEMBRE`,
        amount: Number(invoice.total_amount),
        direction: 'CREDIT',
      },
      { date: isoDate(-5), label: 'FRAIS TENUE COMPTE', amount: 2_500, direction: 'DEBIT' },
    ]);
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'exact.csv',
    );
    const imported = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...as(accountant.accessToken),
      body: { documentId, format: 'CSV' },
    });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ linesAccepted: 2, autoMatched: 1, suggested: 0 });

    const declarationAfter = await ctx.admin.bank_transfer_declarations.findUniqueOrThrow({
      where: { id: declared.body.id },
    });
    expect(declarationAfter.status).toBe('APPROVED');
    expect(declarationAfter.payment_id).toBeTruthy();

    const payment = await ctx.admin.payments.findUniqueOrThrow({
      where: { id: declarationAfter.payment_id as string },
    });
    expect(payment.status).toBe('CONFIRMED');

    const receipts = await ctx.admin.receipts.count({ where: { payment_id: payment.id } });
    expect(receipts).toBeGreaterThan(0);

    const match = await ctx.admin.reconciliation_matches.findFirstOrThrow({
      where: { declaration_id: declared.body.id },
    });
    expect(match.match_type).toBe('EXACT');
    expect(match.status).toBe('CONFIRMED');
    expect(match.confidence_score).toBe(100);

    const line = await ctx.admin.bank_statement_lines.findUniqueOrThrow({
      where: { id: match.statement_line_id },
    });
    expect(line.is_matched).toBe(true);
    expect(line.matched_amount.toString()).toBe(invoice.total_amount.toString());

    const statement = await ctx.admin.bank_statements.findUniqueOrThrow({
      where: { id: line.statement_id },
    });
    expect(statement.matched_lines_count).toBe(1);
    expect(statement.status).toBe('RECONCILED');
  });

  it('montant et date proches d’une déclaration en attente, sans référence : suggestion PROPOSED, confirmation manuelle → déclaration approuvée, quittance émise', async () => {
    const invoiceId = invoiceOf.get(tenant(1)) as string;
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
    const proofId = await createProofDocument(
      ctx,
      agency.organizationId,
      `checksum-suggest-${uuidv7()}`,
    );

    const declared = await api(ctx, 'POST', '/bank-transfer-declarations', {
      ...as(collector.accessToken),
      body: {
        tenantId: tenant(1),
        leaseId: lease(1),
        invoiceId,
        declaredAmount: Number(invoice.total_amount),
        transferDate: isoDate(-1),
        payerName: 'Alphonse Ngoma',
        beneficiaryBankAccountId: bankAccountId,
        proofDocumentId: proofId,
        clientRef: uuidv7(),
      },
    });
    expect(declared.status).toBe(201);

    // Aucune référence structurée dans le libellé : la règle EXACT ne peut
    // pas s'appliquer, seul le score (montant identique, date du jour,
    // libellé proche du nom du payeur) doit dépasser le seuil par défaut (75).
    const content = bgfiCsv([
      {
        date: isoDate(-1),
        label: 'VIR RECU ALPHONSE NGOMA',
        amount: Number(invoice.total_amount),
        direction: 'CREDIT',
      },
      { date: isoDate(-6), label: 'FRAIS DIVERS', amount: 1_500, direction: 'DEBIT' },
    ]);
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'suggest.csv',
    );
    const imported = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...as(accountant.accessToken),
      body: { documentId, format: 'CSV' },
    });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ linesAccepted: 2, autoMatched: 0, suggested: 1 });

    const proposed = await ctx.admin.reconciliation_matches.findFirstOrThrow({
      where: { declaration_id: declared.body.id },
    });
    expect(proposed.match_type).toBe('SUGGESTED');
    expect(proposed.status).toBe('PROPOSED');
    expect(proposed.confidence_score).toBeGreaterThanOrEqual(75);

    // Visible aussi via l'endpoint de suggestions à la demande, non persistant.
    const suggestions = await api(
      ctx,
      'GET',
      `/bank-statement-lines/${proposed.statement_line_id}/suggestions`,
      {
        ...as(accountant.accessToken),
      },
    );
    expect(suggestions.status).toBe(200);
    expect(suggestions.body.items.length).toBeGreaterThan(0);
    expect(suggestions.body.items[0]).toMatchObject({
      targetType: 'DECLARATION',
      targetId: declared.body.id,
    });

    const confirmed = await api(ctx, 'POST', `/reconciliation-matches/${proposed.id}/confirm`, {
      ...as(accountant.accessToken),
      body: {},
    });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('CONFIRMED');

    const declarationAfter = await ctx.admin.bank_transfer_declarations.findUniqueOrThrow({
      where: { id: declared.body.id },
    });
    expect(declarationAfter.status).toBe('APPROVED');

    const payment = await ctx.admin.payments.findUniqueOrThrow({
      where: { id: declarationAfter.payment_id as string },
    });
    expect(payment.status).toBe('CONFIRMED');
    const receipts = await ctx.admin.receipts.count({ where: { payment_id: payment.id } });
    expect(receipts).toBeGreaterThan(0);
  });

  it('rapprochement manuel direct sur un paiement en attente, puis annulation : paiement contre-passé, facture rouverte, écriture miroir', async () => {
    const invoiceId = invoiceOf.get(tenant(2)) as string;
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });

    const created = await api(ctx, 'POST', '/payments', {
      ...as(accountant.accessToken),
      body: {
        method: 'BANK_TRANSFER',
        amount: Number(invoice.total_amount),
        tenantId: tenant(2),
        leaseId: lease(2),
        allocations: [{ invoiceId, amount: Number(invoice.total_amount) }],
        confirmed: false,
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('PENDING_VERIFICATION');
    const paymentId = created.body.id as string;

    // Date largement hors fenêtre (défaut 15 jours) : le moteur ne doit
    // trouver aucun candidat à l'import, la ligne reste UNMATCHED.
    const content = bgfiCsv([
      {
        date: isoDate(-40),
        label: 'VIR DIVERS SANS RAPPORT',
        amount: Number(invoice.total_amount),
        direction: 'CREDIT',
      },
      { date: isoDate(-38), label: 'FRAIS AGIOS', amount: 1_000, direction: 'DEBIT' },
    ]);
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'manual.csv',
    );
    const imported = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...as(accountant.accessToken),
      body: { documentId, format: 'CSV' },
    });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ autoMatched: 0, suggested: 0 });

    const line = await ctx.admin.bank_statement_lines.findFirstOrThrow({
      where: { statement_id: imported.body.statementId, direction: 'CREDIT' },
    });
    expect(line.is_matched).toBe(false);

    const manual = await api(ctx, 'POST', '/reconciliation-matches', {
      ...as(accountant.accessToken),
      body: {
        statementLineId: line.id,
        targetType: 'PAYMENT',
        targetId: paymentId,
        matchedAmount: Number(invoice.total_amount),
        reason: 'Virement identifié manuellement après appel du locataire.',
      },
    });
    expect(manual.status).toBe(201);
    expect(manual.body.status).toBe('CONFIRMED');
    expect(manual.body.matchType).toBe('MANUAL');
    expect(manual.body.confidenceScore).toBe(100);
    const matchId = manual.body.id as string;

    const confirmedPayment = await ctx.admin.payments.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(confirmedPayment.status).toBe('CONFIRMED');
    const paidInvoice = await ctx.admin.rent_invoices.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(paidInvoice.status).toBe('PAID');
    const receiptsBefore = await ctx.admin.receipts.count({ where: { payment_id: paymentId } });
    expect(receiptsBefore).toBeGreaterThan(0);

    const reversed = await api(ctx, 'POST', `/reconciliation-matches/${matchId}/reverse`, {
      ...as(accountant.accessToken),
      body: { reason: 'Rapprochement erroné : mauvais paiement.' },
    });
    expect(reversed.status).toBe(200);
    expect(reversed.body.reversed.status).toBe('REVERSED');
    expect(reversed.body.mirror.status).toBe('REVERSED');
    expect(reversed.body.mirror.reversalOfId).toBe(matchId);

    const originalPayment = await ctx.admin.payments.findUniqueOrThrow({
      where: { id: paymentId },
    });
    // Contre-passation : le paiement d'origine n'est JAMAIS modifié.
    expect(originalPayment.status).toBe('CONFIRMED');
    const mirrorPayment = await ctx.admin.payments.findFirst({
      where: { reversal_of_id: paymentId },
    });
    expect(mirrorPayment?.status).toBe('REVERSED');

    const reopenedInvoice = await ctx.admin.rent_invoices.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(['ISSUED', 'OVERDUE']).toContain(reopenedInvoice.status);

    const lineAfter = await ctx.admin.bank_statement_lines.findUniqueOrThrow({
      where: { id: line.id },
    });
    expect(lineAfter.is_matched).toBe(false);
    expect(lineAfter.matched_amount.toString()).toBe('0');
  });

  it('chèque DEPOSITED compensé par rapprochement manuel d’une ligne : CLEARED, paiement CONFIRMED, quittance émise', async () => {
    const invoiceId = invoiceOf.get(tenant(3)) as string;
    const invoice = await ctx.admin.rent_invoices.findUniqueOrThrow({ where: { id: invoiceId } });
    const checkNumber = `CHK-RECON-${Date.now()}`;

    const received = await api(ctx, 'POST', '/bank-checks', {
      ...as(accountant.accessToken),
      body: {
        tenantId: tenant(3),
        leaseId: lease(3),
        invoiceId,
        checkNumber,
        drawerName: 'Pauline Okemba',
        drawerBankCode: 'BGFI',
        drawerBankName: 'BGFIBank Congo',
        amount: Number(invoice.total_amount),
        issueDate: isoDate(-10),
      },
    });
    expect(received.status).toBe(201);
    expect(received.body.status).toBe('RECEIVED');
    const checkId = received.body.id as string;
    const paymentId = received.body.paymentId as string;

    const pendingPayment = await ctx.admin.payments.findUniqueOrThrow({ where: { id: paymentId } });
    expect(pendingPayment.status).toBe('PENDING_VERIFICATION');

    const deposited = await api(ctx, 'POST', `/bank-checks/${checkId}/deposit`, {
      ...as(accountant.accessToken),
      body: { depositBankAccountId: bankAccountId, depositDate: isoDate(-3) },
    });
    expect(deposited.status).toBe(200);
    expect(deposited.body.status).toBe('DEPOSITED');

    // Ligne sans référence LOY : le rapprochement se fait par identification
    // manuelle (montant/date connus), PAS par la règle EXACT — c'est le
    // chemin `BankChecksService.settleFromReconciliation` appelé depuis
    // `MatchSettlementService`, distinct de `POST /bank-checks/{id}/clear`.
    const clearingDate = isoDate(-1);
    const content = bgfiCsv([
      {
        date: clearingDate,
        label: 'REMISE CHEQUE AGENCE',
        amount: Number(invoice.total_amount),
        direction: 'CREDIT',
      },
      { date: isoDate(-7), label: 'FRAIS DIVERS', amount: 1_200, direction: 'DEBIT' },
    ]);
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'check.csv',
    );
    const imported = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...as(accountant.accessToken),
      body: { documentId, format: 'CSV' },
    });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({ autoMatched: 0 });

    const line = await ctx.admin.bank_statement_lines.findFirstOrThrow({
      where: { statement_id: imported.body.statementId, direction: 'CREDIT' },
    });
    expect(line.is_matched).toBe(false);

    const manual = await api(ctx, 'POST', '/reconciliation-matches', {
      ...as(accountant.accessToken),
      body: {
        statementLineId: line.id,
        targetType: 'CHECK',
        targetId: checkId,
        matchedAmount: Number(invoice.total_amount),
        reason: 'Chèque identifié sur le relevé après remise en banque.',
      },
    });
    expect(manual.status).toBe(201);
    expect(manual.body.status).toBe('CONFIRMED');
    expect(manual.body.matchType).toBe('MANUAL');

    const clearedCheck = await ctx.admin.bank_checks.findUniqueOrThrow({ where: { id: checkId } });
    expect(clearedCheck.status).toBe('CLEARED');
    expect(clearedCheck.clearing_date).not.toBeNull();
    expect((clearedCheck.clearing_date as Date).toISOString().slice(0, 10)).toBe(clearingDate);

    const clearedPayment = await ctx.admin.payments.findUniqueOrThrow({ where: { id: paymentId } });
    expect(clearedPayment.status).toBe('CONFIRMED');

    const receipts = await ctx.admin.receipts.count({ where: { payment_id: paymentId } });
    expect(receipts).toBeGreaterThan(0);

    const lineAfter = await ctx.admin.bank_statement_lines.findUniqueOrThrow({
      where: { id: line.id },
    });
    expect(lineAfter.is_matched).toBe(true);
    expect(lineAfter.matched_amount.toString()).toBe(invoice.total_amount.toString());
  });
});
