/**
 * Rapprochement bancaire et chèques de démonstration — phase 6.
 *
 * Idempotent : le relevé est retrouvé par son empreinte SHA-256
 * (`file_checksum_sha256`), le chèque par sa clé métier (`drawer_bank_code`
 * + `check_number`), les paiements créés ici par `client_ref`. Relancer le
 * seed ne duplique rien. Décor : le compte BGFI de l'agence (phase 1), le
 * bail A1 et sa facture ÉMISE du mois courant (phase 3), la déclaration de
 * virement SOUMISE du bail A2 (phase 4), et la locataire Chancelle Obami
 * (phase 1, sans bail actif).
 *
 * Simplification assumée : le rapprochement EXACT déroule le circuit complet
 * (paiement CONFIRMED + imputation + facture soldée), comme le ferait une
 * confirmation réelle, mais sans générer de quittance PDF — hors périmètre
 * d'un jeu de données de démonstration.
 */
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export interface Phase6Report {
  bankStatements: number;
  statementLines: number;
  exactMatches: number;
  suggestedMatches: number;
  bankChecks: number;
}

const now = new Date(Date.now() + 3_600_000);
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const ym = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const daysAgo = (n: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - n));

async function next(
  prisma: PrismaClient,
  org: string,
  kind: string,
  period: string,
  prefix: string,
  padding = 5,
): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{ number: string }>>(
    `WITH r AS (SELECT next_sequence($1::uuid, $2::text, $3::text) AS v)
     SELECT format_sequence_number($4::text, $3::text, r.v, $5::smallint) AS number FROM r`,
    org,
    kind,
    period,
    prefix,
    padding,
  );
  return rows[0].number;
}

export async function seedPhase6(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Phase6Report> {
  const bgfi = await prisma.bank_accounts.findFirstOrThrow({
    where: { organization_id: organizationId, bank_code: 'BGFI' },
    select: { id: true },
  });
  const collector = await prisma.users.findUniqueOrThrow({
    where: { phone_e164: '+242066000002' },
  });
  const Y = now.getUTCFullYear();
  const M = now.getUTCMonth();

  const a1 = await prisma.leases.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a1' },
    select: { id: true, primary_tenant_id: true, landlord_id: true },
  });
  const a1Invoice = await prisma.rent_invoices.findFirstOrThrow({
    where: { organization_id: organizationId, lease_id: a1.id, period_start: day(Y, M, 1) },
    select: { id: true, invoice_number: true, total_amount: true },
  });
  const a2Declaration = await prisma.bank_transfer_declarations.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-virement-declare-a2' },
    select: { id: true, declared_amount: true },
  });

  const statement = await seedStatement(prisma, organizationId, {
    bgfiAccountId: bgfi.id,
    collectorId: collector.id,
    a1,
    a1Invoice,
    a2Declaration,
  });

  const tenant = await prisma.tenants.findFirstOrThrow({
    where: { organization_id: organizationId, primary_phone: '+242066200003' },
    select: { id: true },
  });
  const bankChecks = await seedOldDepositedCheck(prisma, organizationId, {
    bgfiAccountId: bgfi.id,
    collectorId: collector.id,
    tenantId: tenant.id,
  });

  return { ...statement, bankChecks };
}

interface StatementInput {
  bgfiAccountId: string;
  collectorId: string;
  a1: { id: string; primary_tenant_id: string; landlord_id: string };
  a1Invoice: { id: string; invoice_number: string; total_amount: bigint };
  a2Declaration: { id: string; declared_amount: bigint };
}

type StatementReport = Omit<Phase6Report, 'bankChecks'>;

/**
 * Un relevé BGFI équilibré avec 3 crédits (EXACT confirmé, SUGGÉRÉ en
 * attente, sans correspondance) et 1 débit (frais), voir docs/api/
 * phase6-contract.md § « Moteur de rapprochement ».
 */
async function seedStatement(
  prisma: PrismaClient,
  organizationId: string,
  input: StatementInput,
): Promise<StatementReport> {
  const none: StatementReport = {
    bankStatements: 0,
    statementLines: 0,
    exactMatches: 0,
    suggestedMatches: 0,
  };
  const checksum = createHash('sha256')
    .update(`seed-releve-bgfi-agence-${organizationId}`)
    .digest('hex');
  const existing = await prisma.bank_statements.findFirst({
    where: {
      organization_id: organizationId,
      bank_account_id: input.bgfiAccountId,
      file_checksum_sha256: checksum,
    },
    select: { id: true },
  });
  if (existing) return none;

  const Y = now.getUTCFullYear();
  const M = now.getUTCMonth();
  const periodStart = day(Y, M, 1);
  const periodEnd = day(Y, M, Math.max(2, now.getUTCDate()));

  const creditExact = input.a1Invoice.total_amount;
  const creditSuggested = input.a2Declaration.declared_amount;
  const creditUnmatched = 12_345n;
  const debitFees = 5_000n;
  const openingBalance = 500_000n;
  const closingBalance =
    openingBalance + creditExact + creditSuggested + creditUnmatched - debitFees;

  const dateExact = day(Y, M, Math.min(5, periodEnd.getUTCDate()));
  const dateSuggested = periodEnd;
  const dateUnmatched = day(Y, M, Math.min(2, periodEnd.getUTCDate()));
  const dateFees = periodEnd;

  const documentId = uuidv7();
  await prisma.documents.create({
    data: {
      id: documentId,
      organization_id: organizationId,
      kind: 'BANK_STATEMENT',
      storage_provider: 'R2',
      bucket: 'immodesk',
      object_key: `org/${organizationId}/bank-statements/seed-releve-bgfi-agence.csv`,
      file_name: 'releve-bgfi-agence-demo.csv',
      mime_type: 'text/csv',
      size_bytes: 2_048n,
      checksum_sha256: checksum,
      uploaded_by_user_id: input.collectorId,
      client_ref: 'seed-releve-bgfi-agence-doc',
    },
  });

  const statementId = uuidv7();
  await prisma.bank_statements.create({
    data: {
      id: statementId,
      organization_id: organizationId,
      bank_account_id: input.bgfiAccountId,
      format: 'CSV',
      // Une ligne reste SUGGÉRÉE (en attente de validation humaine) :
      // le relevé n'est donc pas encore intégralement RECONCILED.
      status: 'RECONCILING',
      statement_reference: `BGFI-${ym(now)}`,
      period_start: periodStart,
      period_end: periodEnd,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      currency: 'XAF',
      lines_count: 4,
      matched_lines_count: 1,
      total_credit_amount: creditExact + creditSuggested + creditUnmatched,
      total_debit_amount: debitFees,
      document_id: documentId,
      file_checksum_sha256: checksum,
      imported_by_user_id: input.collectorId,
      imported_at: new Date(),
      parsed_at: new Date(),
    },
  });

  const lineExactId = uuidv7();
  const lineSuggestedId = uuidv7();
  let runningBalance = openingBalance;

  runningBalance += creditExact;
  await prisma.bank_statement_lines.create({
    data: {
      id: lineExactId,
      organization_id: organizationId,
      statement_id: statementId,
      bank_account_id: input.bgfiAccountId,
      line_number: 1,
      direction: 'CREDIT',
      operation_date: dateExact,
      value_date: dateExact,
      amount: creditExact,
      currency: 'XAF',
      running_balance: runningBalance,
      label: `VIR RECU ${input.a1Invoice.invoice_number} LOYER RESIDENCE MPILA A1`,
      counterparty_name: 'Bernadette Loemba',
      end_to_end_reference: input.a1Invoice.invoice_number,
      is_matched: true,
      matched_amount: creditExact,
      normalized_label: `VIR RECU ${input.a1Invoice.invoice_number} LOYER RESIDENCE MPILA A1`,
    },
  });

  runningBalance += creditSuggested;
  await prisma.bank_statement_lines.create({
    data: {
      id: lineSuggestedId,
      organization_id: organizationId,
      statement_id: statementId,
      bank_account_id: input.bgfiAccountId,
      line_number: 2,
      direction: 'CREDIT',
      operation_date: dateSuggested,
      value_date: dateSuggested,
      amount: creditSuggested,
      currency: 'XAF',
      running_balance: runningBalance,
      label: 'VIREMENT RECU SERGE MAKAYA REF CONF16092026',
      counterparty_name: 'Serge Makaya',
      normalized_label: 'VIREMENT RECU SERGE MAKAYA REF CONF16092026',
    },
  });

  runningBalance += creditUnmatched;
  await prisma.bank_statement_lines.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      statement_id: statementId,
      bank_account_id: input.bgfiAccountId,
      line_number: 3,
      direction: 'CREDIT',
      operation_date: dateUnmatched,
      value_date: dateUnmatched,
      amount: creditUnmatched,
      currency: 'XAF',
      running_balance: runningBalance,
      label: 'VIREMENT RECU CLIENT INCONNU',
      normalized_label: 'VIREMENT RECU CLIENT INCONNU',
    },
  });

  runningBalance -= debitFees;
  await prisma.bank_statement_lines.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      statement_id: statementId,
      bank_account_id: input.bgfiAccountId,
      line_number: 4,
      direction: 'DEBIT',
      operation_date: dateFees,
      value_date: dateFees,
      amount: debitFees,
      currency: 'XAF',
      running_balance: runningBalance,
      label: 'FRAIS DE TENUE DE COMPTE',
      normalized_label: 'FRAIS DE TENUE DE COMPTE',
    },
  });

  // --- Match EXACT : facture A1 du mois courant soldée par virement ------
  const paymentId = uuidv7();
  const paymentReference = await next(prisma, organizationId, 'PAYMENT', ym(dateExact), 'PAY');
  await prisma.payments.create({
    data: {
      id: paymentId,
      organization_id: organizationId,
      tenant_id: input.a1.primary_tenant_id,
      lease_id: input.a1.id,
      landlord_id: input.a1.landlord_id,
      method: 'BANK_TRANSFER',
      status: 'CONFIRMED',
      reference: paymentReference,
      amount: creditExact,
      net_amount: creditExact,
      allocated_amount: creditExact,
      unallocated_amount: 0n,
      bank_account_id: input.bgfiAccountId,
      payment_date: dateExact,
      external_reference: input.a1Invoice.invoice_number,
      confirmed_at: new Date(),
      client_ref: 'seed-pay-a1-bank-reconciled',
    },
  });
  await prisma.payment_allocations.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      payment_id: paymentId,
      invoice_id: input.a1Invoice.id,
      amount: creditExact,
      allocation_date: dateExact,
      allocation_order: 1,
    },
  });
  await prisma.rent_invoices.update({
    where: { id: input.a1Invoice.id },
    data: { status: 'PAID', paid_amount: creditExact, balance_amount: 0n, paid_at: new Date() },
  });
  await prisma.reconciliation_matches.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      statement_line_id: lineExactId,
      payment_id: paymentId,
      match_type: 'EXACT',
      status: 'CONFIRMED',
      matched_amount: creditExact,
      confidence_score: 100,
      match_criteria: {
        reference: input.a1Invoice.invoice_number,
        amountMatch: true,
        dateWindowDays: 15,
      },
      confirmed_at: new Date(),
    },
  });

  // --- Suggestion : virement A2 probable, en attente de validation -------
  await prisma.reconciliation_matches.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      statement_line_id: lineSuggestedId,
      declaration_id: input.a2Declaration.id,
      match_type: 'SUGGESTED',
      status: 'PROPOSED',
      matched_amount: creditSuggested,
      confidence_score: 95,
      match_criteria: {
        amountMatch: true,
        amountScore: 50,
        dateProximityDays: 0,
        dateScore: 20,
        payerSimilarityScore: 15,
        pendingDeclarationBonus: 10,
      },
    },
  });

  return { bankStatements: 1, statementLines: 4, exactMatches: 1, suggestedMatches: 1 };
}

/**
 * Chèque `DEPOSITED` depuis 30 jours calendaires (largement plus que les 15
 * jours ouvrés de `checkClearingAlertDays`), pour illustrer l'alerte
 * quotidienne des chèques sans issue. Paiement lié `PENDING_VERIFICATION`,
 * comme le ferait `BankChecksService.receive` (module bank-checks), mais en
 * Prisma direct puisque le seed s'exécute hors contexte HTTP/tenant.
 */
async function seedOldDepositedCheck(
  prisma: PrismaClient,
  organizationId: string,
  input: { bgfiAccountId: string; collectorId: string; tenantId: string },
): Promise<number> {
  const checkNumber = 'CHQ-000456';
  const drawerBankCode = 'ECOBANK';
  const existing = await prisma.bank_checks.findFirst({
    where: {
      organization_id: organizationId,
      drawer_bank_code: drawerBankCode,
      check_number: checkNumber,
    },
    select: { id: true },
  });
  if (existing) return 0;

  const issueDate = daysAgo(35);
  const depositDate = daysAgo(30);
  const amount = 90_000n;
  const clientRef = 'seed-cheque-encaisse-longue-date';

  const paymentId = uuidv7();
  const reference = await next(prisma, organizationId, 'PAYMENT', ym(issueDate), 'PAY');
  await prisma.payments.create({
    data: {
      id: paymentId,
      organization_id: organizationId,
      tenant_id: input.tenantId,
      method: 'BANK_CHECK',
      status: 'PENDING_VERIFICATION',
      reference,
      amount,
      net_amount: amount,
      allocated_amount: 0n,
      unallocated_amount: amount,
      payment_date: issueDate,
      received_by_user_id: input.collectorId,
      external_reference: checkNumber,
      client_ref: clientRef,
    },
  });

  await prisma.bank_checks.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      tenant_id: input.tenantId,
      payment_id: paymentId,
      status: 'DEPOSITED',
      check_number: checkNumber,
      drawer_name: 'Chancelle Obami',
      drawer_bank_code: drawerBankCode,
      drawer_bank_name: 'Ecobank Congo',
      amount,
      currency: 'XAF',
      issue_date: issueDate,
      received_at: issueDate,
      deposit_date: depositDate,
      deposit_bank_account_id: input.bgfiAccountId,
      received_by_user_id: input.collectorId,
      notes: 'Chèque déposé, en attente de compensation depuis plus de quinze jours ouvrés.',
    },
  });
  return 1;
}
