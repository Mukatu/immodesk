/**
 * Baux et dépôts de démonstration — phase 2.
 *
 * Déterministe et idempotent : chaque bail est retrouvé par son `client_ref`
 * avant d'être créé. Relancer le seed ne duplique rien et ne consomme pas de
 * numéro de la série `BAIL-{AAAA}-{seq}`.
 *
 * Le décor reprend celui de la phase 1 : Résidence Mpila, lots A1 à A12,
 * locataires de Poto-Poto, Bacongo et Makélékélé.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { DEFAULT_CONTRACT_TEMPLATE } from '../src/modules/pdf/domain/contract-template';

export interface LeasesReport {
  activeLeases: number;
  draftLeases: number;
  deposits: number;
  revisions: number;
}

const YEAR = new Date().getUTCFullYear();

interface LeaseSeed {
  clientRef: string;
  unitCode: string;
  tenantPhone: string;
  rentAmount: bigint;
  chargesAmount: bigint;
  depositAmount: bigint;
  /** Encaissé à ce jour : les deux baux actifs ont un dépôt incomplet. */
  collectedAmount: bigint;
  status: 'ACTIVE' | 'DRAFT';
  paymentDueDay: number;
}

const LEASES: LeaseSeed[] = [
  {
    clientRef: 'seed-bail-a1',
    unitCode: 'A1',
    tenantPhone: '+242066200001',
    rentAmount: 75_000n,
    chargesAmount: 10_000n,
    depositAmount: 150_000n,
    collectedAmount: 100_000n,
    status: 'ACTIVE',
    paymentDueDay: 5,
  },
  {
    clientRef: 'seed-bail-a2',
    unitCode: 'A2',
    tenantPhone: '+242066200002',
    rentAmount: 75_000n,
    chargesAmount: 10_000n,
    depositAmount: 150_000n,
    collectedAmount: 75_000n,
    status: 'ACTIVE',
    paymentDueDay: 10,
  },
  {
    clientRef: 'seed-bail-a3-brouillon',
    unitCode: 'A3',
    tenantPhone: '+242066200003',
    rentAmount: 80_000n,
    chargesAmount: 10_000n,
    depositAmount: 160_000n,
    collectedAmount: 0n,
    status: 'DRAFT',
    paymentDueDay: 5,
  },
];

export async function seedLeases(
  prisma: PrismaClient,
  organizationId: string,
): Promise<LeasesReport> {
  await upsertContractTemplate(prisma, organizationId);

  const report: LeasesReport = { activeLeases: 0, draftLeases: 0, deposits: 0, revisions: 0 };

  for (const seed of LEASES) {
    const leaseId = await upsertLease(prisma, organizationId, seed);
    if (seed.status === 'ACTIVE') {
      report.activeLeases += 1;
      report.deposits += (await upsertDeposit(prisma, organizationId, leaseId, seed)) ? 1 : 0;
    } else {
      report.draftLeases += 1;
    }
  }

  report.revisions = (await upsertFutureRevision(prisma, organizationId)) ? 1 : 0;
  return report;
}

/** Gabarit de contrat par défaut, posé dans `settings_json.contractTemplate`. */
async function upsertContractTemplate(prisma: PrismaClient, organizationId: string): Promise<void> {
  const settings = await prisma.organization_settings.findUnique({
    where: { organization_id: organizationId },
    select: { settings_json: true },
  });
  const json = (settings?.settings_json ?? {}) as Record<string, unknown>;
  if (json.contractTemplate) return;

  await prisma.organization_settings.update({
    where: { organization_id: organizationId },
    data: {
      settings_json: {
        ...json,
        contractTemplate: DEFAULT_CONTRACT_TEMPLATE,
      } as unknown as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
  });
}

async function upsertLease(
  prisma: PrismaClient,
  organizationId: string,
  seed: LeaseSeed,
): Promise<string> {
  const existing = await prisma.leases.findFirst({
    where: { organization_id: organizationId, client_ref: seed.clientRef },
    select: { id: true },
  });
  if (existing) return existing.id;

  const unit = await prisma.units.findFirstOrThrow({
    where: { organization_id: organizationId, code: seed.unitCode, deleted_at: null },
    select: { id: true, property_id: true },
  });
  const property = await prisma.properties.findFirstOrThrow({
    where: { id: unit.property_id },
    select: { landlord_id: true },
  });
  const tenant = await prisma.tenants.findFirstOrThrow({
    where: { organization_id: organizationId, primary_phone: seed.tenantPhone },
    select: { id: true },
  });

  const id = uuidv7();
  const reference =
    seed.status === 'ACTIVE' ? await nextLeaseReference(prisma, organizationId) : `BROUILLON-${id}`;

  await prisma.leases.create({
    data: {
      id,
      organization_id: organizationId,
      unit_id: unit.id,
      property_id: unit.property_id,
      landlord_id: property.landlord_id,
      primary_tenant_id: tenant.id,
      reference,
      status: seed.status,
      start_date: new Date(Date.UTC(YEAR, 0, 1)),
      end_date: new Date(Date.UTC(YEAR + 1, 11, 31)),
      move_in_date: seed.status === 'ACTIVE' ? new Date(Date.UTC(YEAR, 0, 1)) : null,
      rent_period: 'MONTHLY',
      rent_amount: seed.rentAmount,
      charges_amount: seed.chargesAmount,
      deposit_amount: seed.depositAmount,
      currency: 'XAF',
      payment_due_day: seed.paymentDueDay,
      grace_days: 5,
      preferred_payment_method: 'CASH',
      notice_days: 30,
      auto_renew: true,
      signed_at: seed.status === 'ACTIVE' ? new Date(Date.UTC(YEAR, 0, 1)) : null,
      client_ref: seed.clientRef,
      notes:
        seed.status === 'DRAFT'
          ? 'Brouillon de démonstration : dossier en cours de constitution.'
          : null,
    },
  });

  if (seed.status === 'ACTIVE') {
    await prisma.lease_parties.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        lease_id: id,
        role: 'PRIMARY_TENANT',
        tenant_id: tenant.id,
        share_bps: 10_000,
        is_solidary: true,
      },
    });
  }
  return id;
}

/** `BAIL-{AAAA}-{seq}` réservé par la fonction SQL, comme en production. */
async function nextLeaseReference(prisma: PrismaClient, organizationId: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{ number: string }>>(
    `WITH reserved AS (SELECT next_sequence($1::uuid, 'LEASE', $2::text) AS value)
     SELECT format_sequence_number('BAIL', $2::text, reserved.value, 5::smallint) AS number
       FROM reserved`,
    organizationId,
    String(YEAR),
  );
  return rows[0].number;
}

/**
 * Dépôt PARTIELLEMENT encaissé : c'est le cas le plus fréquent sur le
 * terrain — la caution se verse en deux ou trois fois, et le tableau de bord
 * doit montrer ce qui reste à réclamer.
 */
async function upsertDeposit(
  prisma: PrismaClient,
  organizationId: string,
  leaseId: string,
  seed: LeaseSeed,
): Promise<boolean> {
  const existing = await prisma.deposits.findFirst({
    where: { lease_id: leaseId },
    select: { id: true },
  });
  if (existing) return false;

  const lease = await prisma.leases.findFirstOrThrow({
    where: { id: leaseId },
    select: { primary_tenant_id: true },
  });

  const depositId = uuidv7();
  const collected = seed.collectedAmount;
  const monthsEquivalent = Number(
    (2n * seed.depositAmount + seed.rentAmount) / (2n * seed.rentAmount),
  );

  await prisma.deposits.create({
    data: {
      id: depositId,
      organization_id: organizationId,
      lease_id: leaseId,
      tenant_id: lease.primary_tenant_id,
      status: collected > 0n ? 'PARTIALLY_PAID' : 'PENDING',
      required_amount: seed.depositAmount,
      collected_amount: collected,
      deducted_amount: 0n,
      refunded_amount: 0n,
      held_amount: collected,
      currency: 'XAF',
      months_equivalent: monthsEquivalent,
      due_date: new Date(Date.UTC(YEAR, 0, 31)),
    },
  });

  if (collected > 0n) {
    await prisma.deposit_movements.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        deposit_id: depositId,
        lease_id: leaseId,
        movement_type: 'COLLECTION',
        amount: collected,
        currency: 'XAF',
        movement_date: new Date(Date.UTC(YEAR, 0, 15)),
        reason: 'Premier versement de la caution, en espèces au bureau.',
      },
    });
  }
  return true;
}

/**
 * Une révision de loyer FUTURE sur le bail du lot A1 : le cron quotidien
 * l'appliquera le 1er janvier suivant. Elle démontre que `rent_amount` ne
 * bouge pas avant la date d'effet et que `GET /leases/{id}/rent-at` sait
 * répondre pour les deux périodes.
 */
async function upsertFutureRevision(
  prisma: PrismaClient,
  organizationId: string,
): Promise<boolean> {
  const lease = await prisma.leases.findFirst({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a1' },
    select: { id: true, rent_amount: true, charges_amount: true },
  });
  if (!lease) return false;

  const effectiveDate = new Date(Date.UTC(YEAR + 1, 0, 1));
  const existing = await prisma.lease_rent_revisions.findFirst({
    where: { lease_id: lease.id, effective_date: effectiveDate },
    select: { id: true },
  });
  if (existing) return false;

  await prisma.lease_rent_revisions.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      lease_id: lease.id,
      effective_date: effectiveDate,
      previous_rent_amount: lease.rent_amount,
      new_rent_amount: lease.rent_amount + 5_000n,
      previous_charges_amount: lease.charges_amount,
      new_charges_amount: lease.charges_amount,
      currency: 'XAF',
      reason: 'Révision annuelle prévue au contrat.',
    },
  });
  return true;
}
