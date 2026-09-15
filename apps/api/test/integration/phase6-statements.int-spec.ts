import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { api, startTestApp, stopTestApp, type TestContext } from './helpers';
import { addMember, createAgency, dropOrganization, type Agency } from './phase3-fixtures';
import { ensureOrgBankAccount } from './phase4-fixtures';

const fixture = (name: string): Buffer => readFileSync(join(__dirname, 'fixtures', name));

/** Cycle réel upload-url → PUT MinIO → enregistrement, comme un vrai client. */
async function uploadStatementDocument(
  ctx: TestContext,
  agency: Agency,
  bankAccountId: string,
  content: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const signed = await api(ctx, 'POST', '/documents/upload-url', {
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
    body: {
      fileName,
      mimeType,
      sizeBytes: content.length,
      kind: 'BANK_STATEMENT',
      relatedEntityType: 'bank_statement',
      relatedEntityId: bankAccountId,
    },
  });
  if (signed.status !== 201) {
    throw new Error(`upload-url en échec : ${JSON.stringify(signed.body)}`);
  }
  const put = await fetch(signed.body.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: content,
  });
  if (put.status !== 200) throw new Error(`PUT MinIO en échec : ${put.status}`);

  const registered = await api(ctx, 'POST', '/documents', {
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
    body: {
      objectKey: signed.body.objectKey,
      fileName,
      mimeType,
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

describe('Phase 6 — import de relevés bancaires', () => {
  let ctx: TestContext;
  let agency: Agency;
  let accountant: { accessToken: string; userId: string };
  let bankAccountId: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    agency = await createAgency(ctx, 'Statements');
    accountant = await addMember(ctx, agency.organizationId, 'ACCOUNTANT');
    bankAccountId = await ensureOrgBankAccount(ctx, agency.organizationId);
  }, 60_000);

  afterAll(async () => {
    await dropOrganization(ctx.admin, agency.organizationId, [
      agency.owner.userId,
      accountant.userId,
    ]);
    await stopTestApp(ctx);
  });

  const asAccountant = () => ({
    accessToken: accountant.accessToken,
    organizationId: agency.organizationId,
  });

  it('importe un relevé BGFI réel : 201, lignes créées en base', async () => {
    const content = fixture('bgfi.csv');
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'text/csv',
      'bgfi-janvier.csv',
    );

    const imported = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...asAccountant(),
      body: { documentId, format: 'CSV' },
    });
    expect(imported.status).toBe(201);
    expect(imported.body).toMatchObject({
      linesAccepted: 3,
      linesIgnored: 0,
      linesInError: [],
      autoMatched: 0,
      suggested: 0,
    });
    const statementId = imported.body.statementId as string;

    const lines = await ctx.admin.bank_statement_lines.findMany({
      where: { statement_id: statementId },
      orderBy: { line_number: 'asc' },
    });
    expect(lines).toHaveLength(3);
    expect(lines[0].direction).toBe('CREDIT');
    expect(lines[0].amount.toString()).toBe('150000');
    expect(lines[0].normalized_label).not.toBeNull();

    const statement = await ctx.admin.bank_statements.findUnique({ where: { id: statementId } });
    expect(statement?.lines_count).toBe(3);
    expect(statement?.status).toBe('PARSED');

    const detail = await api(ctx, 'GET', `/bank-statements/${statementId}`, asAccountant());
    expect(detail.status).toBe(200);
    expect(detail.body.report).toMatchObject({
      linesAccepted: 3,
      linesIgnored: 0,
      linesInError: [],
    });
    expect(detail.body.isDiscarded).toBe(false);
  });

  it('refuse le réimport du même fichier : 409 BANK.STATEMENT_ALREADY_IMPORTED', async () => {
    const content = fixture('lcb.csv');
    const firstDocumentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'text/csv',
      'lcb.csv',
    );
    const first = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...asAccountant(),
      body: { documentId: firstDocumentId, format: 'CSV' },
    });
    expect(first.status).toBe(201);

    const secondDocumentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'text/csv',
      'lcb-bis.csv',
    );
    const replay = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...asAccountant(),
      body: { documentId: secondDocumentId, format: 'CSV' },
    });
    expect(replay.status).toBe(409);
    expect(replay.body.code).toBe('BANK.STATEMENT_ALREADY_IMPORTED');
    expect(replay.body.details.statementId).toBe(first.body.statementId);
  });

  it('refuse un relevé déséquilibré : 422, aucune ligne ni relevé créés', async () => {
    // Solde de clôture falsifié : 1000000 + 400000 - 20000 = 1380000 attendu,
    // le fichier déclare 1400000 (déséquilibre de 20000).
    const original = fixture('sample.mt940').toString('utf8');
    const tampered = Buffer.from(
      original.replace(':62F:C260131XAF1380000,00', ':62F:C260131XAF1400000,00'),
      'utf8',
    );
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      tampered,
      'text/plain',
      'releve-desequilibre.mt940',
    );

    const before = await ctx.admin.bank_statements.count({
      where: { organization_id: agency.organizationId, bank_account_id: bankAccountId },
    });

    const attempt = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...asAccountant(),
      body: { documentId, format: 'MT940' },
    });
    expect(attempt.status).toBe(422);
    expect(attempt.body.code).toBe('BANK.STATEMENT_BALANCE_MISMATCH');
    expect(attempt.body.details).toMatchObject({
      expected: 1380000,
      actual: 1400000,
      difference: 20000,
    });

    const after = await ctx.admin.bank_statements.count({
      where: { organization_id: agency.organizationId, bank_account_id: bankAccountId },
    });
    expect(after).toBe(before);
  });

  it('abandonne un import : toutes les lignes ignorées, isDiscarded=true en lecture', async () => {
    const content = fixture('ecobank.csv');
    const documentId = await uploadStatementDocument(
      ctx,
      agency,
      bankAccountId,
      content,
      'text/csv',
      'ecobank.csv',
    );
    const imported = await api(ctx, 'POST', `/bank-accounts/${bankAccountId}/statements/import`, {
      ...asAccountant(),
      body: { documentId, format: 'CSV' },
    });
    expect(imported.status).toBe(201);
    const statementId = imported.body.statementId as string;

    const discarded = await api(ctx, 'POST', `/bank-statements/${statementId}/discard`, {
      ...asAccountant(),
      body: { reason: 'Import de test, à écarter.' },
    });
    expect(discarded.status).toBe(200);
    expect(discarded.body.isDiscarded).toBe(true);

    const lines = await ctx.admin.bank_statement_lines.findMany({
      where: { statement_id: statementId },
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => l.is_ignored)).toBe(true);

    const detail = await api(ctx, 'GET', `/bank-statements/${statementId}`, asAccountant());
    expect(detail.body.isDiscarded).toBe(true);

    const again = await api(ctx, 'POST', `/bank-statements/${statementId}/discard`, asAccountant());
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('BANK.STATEMENT_ALREADY_DISCARDED');
  });
});
