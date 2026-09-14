/**
 * Mobile Money et virement déclaré — phase 4.
 *
 * Idempotent (retrouvé par `client_ref` avant création). Les dates sont
 * calculées depuis `Date.now()` : le jeu d'essai reste valide quel que soit
 * le jour d'exécution du seed. Décor : les baux A1 et A2 de la phase 2/3
 * (Résidence Mpila), le compte MTN Mobile Money du bailleur et le compte
 * BGFI de l'agence, tous deux semés en phase 1.
 */
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export interface Phase4Report {
  momoDeclarations: number;
  bankTransferDeclarations: number;
}

const now = new Date(Date.now() + 3_600_000);
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const ym = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

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

export async function seedPhase4(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Phase4Report> {
  const report: Phase4Report = { momoDeclarations: 0, bankTransferDeclarations: 0 };
  const Y = now.getUTCFullYear();
  const M = now.getUTCMonth();

  const collector = await prisma.users.findUniqueOrThrow({
    where: { phone_e164: '+242066000002' },
  });
  const a1 = await prisma.leases.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a1' },
  });
  const a2 = await prisma.leases.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a2' },
  });
  const a1Invoice = await prisma.rent_invoices.findFirst({
    where: { organization_id: organizationId, lease_id: a1.id, period_start: day(Y, M, 1) },
    select: { id: true, total_amount: true },
  });
  const momoAccount = await prisma.bank_accounts.findFirstOrThrow({
    where: { organization_id: organizationId, momo_provider: 'MTN_MOMO' },
    select: { momo_msisdn: true },
  });
  const bgfiAccount = await prisma.bank_accounts.findFirstOrThrow({
    where: { organization_id: organizationId, bank_code: 'BGFI' },
    select: { id: true },
  });

  report.momoDeclarations += await seedMomoDeclaration(prisma, organizationId, {
    tenantId: a1.primary_tenant_id,
    leaseId: a1.id,
    invoiceId: a1Invoice?.id ?? null,
    amount: a1Invoice?.total_amount ?? 160_000n,
    payeeMsisdn: momoAccount.momo_msisdn as string,
    declaredByUserId: collector.id,
  });

  report.bankTransferDeclarations += await seedBankTransferDeclaration(prisma, organizationId, {
    tenantId: a2.primary_tenant_id,
    leaseId: a2.id,
    beneficiaryBankAccountId: bgfiAccount.id,
    submittedByUserId: collector.id,
  });

  return report;
}

async function seedMomoDeclaration(
  prisma: PrismaClient,
  organizationId: string,
  input: {
    tenantId: string;
    leaseId: string;
    invoiceId: string | null;
    amount: bigint;
    payeeMsisdn: string;
    declaredByUserId: string;
  },
): Promise<number> {
  const clientRef = 'seed-momo-declared-a1';
  const existing = await prisma.mobile_money_transactions.findFirst({
    where: { organization_id: organizationId, client_ref: clientRef },
    select: { id: true },
  });
  if (existing) return 0;

  const merchantReference = await next(prisma, organizationId, 'MOMO_DECLARED', ym(now), 'MMD');
  await prisma.mobile_money_transactions.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      tenant_id: input.tenantId,
      lease_id: input.leaseId,
      invoice_id: input.invoiceId,
      provider: 'MTN_MOMO',
      channel: 'DECLARED',
      status: 'DECLARED',
      provider_transaction_id: `MP${ym(now)}.SEED.A56789`,
      merchant_reference: merchantReference,
      payer_msisdn: '+242066123456',
      payee_msisdn: input.payeeMsisdn,
      amount: input.amount,
      declared_by_user_id: input.declaredByUserId,
      client_ref: clientRef,
    },
  });
  return 1;
}

async function seedBankTransferDeclaration(
  prisma: PrismaClient,
  organizationId: string,
  input: {
    tenantId: string;
    leaseId: string;
    beneficiaryBankAccountId: string;
    submittedByUserId: string;
  },
): Promise<number> {
  const clientRef = 'seed-virement-declare-a2';
  const existing = await prisma.bank_transfer_declarations.findFirst({
    where: { organization_id: organizationId, client_ref: clientRef },
    select: { id: true },
  });
  if (existing) return 0;

  const documentId = uuidv7();
  const checksum = createHash('sha256')
    .update(`seed-proof-virement-${organizationId}`)
    .digest('hex');
  await prisma.documents.create({
    data: {
      id: documentId,
      organization_id: organizationId,
      kind: 'OTHER',
      storage_provider: 'R2',
      bucket: 'immodesk',
      object_key: `org/${organizationId}/proofs/seed-virement-a2.jpg`,
      file_name: 'avis-virement-a2.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 204_800n,
      checksum_sha256: checksum,
      uploaded_by_user_id: input.submittedByUserId,
      client_ref: `${clientRef}-proof`,
    },
  });

  await prisma.bank_transfer_declarations.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      tenant_id: input.tenantId,
      lease_id: input.leaseId,
      status: 'SUBMITTED',
      declared_amount: 160_000n,
      transfer_date: now,
      transfer_reference: 'LOY-SEED-A2',
      payer_name: 'Locataire du lot A2',
      beneficiary_bank_account_id: input.beneficiaryBankAccountId,
      proof_document_id: documentId,
      submitted_by_user_id: input.submittedByUserId,
      client_ref: clientRef,
    },
  });
  return 1;
}
