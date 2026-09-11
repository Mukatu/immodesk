import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { api, login, uniquePhone, type TestContext } from './helpers';

/** Signature PNG 1×1 valide, telle qu'un pad de signature la produirait. */
export const SIGNATURE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export function isoDate(days = 0): string {
  const now = new Date(Date.now() + 3_600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
    .toISOString()
    .slice(0, 10);
}

/** Premier jour du mois décalé de `months`, en date civile de Brazzaville. */
export function firstOfMonth(months = 0): string {
  const now = new Date(Date.now() + 3_600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1))
    .toISOString()
    .slice(0, 10);
}

export function yearMonth(date: string): string {
  return date.slice(0, 7).replace('-', '');
}

export interface Agency {
  organizationId: string;
  owner: { accessToken: string; userId: string; phone: string };
}

export async function createAgency(ctx: TestContext, label: string): Promise<Agency> {
  const phone = uniquePhone();
  const owner = await login(ctx, phone);
  const organization = await api(ctx, 'POST', '/organizations', {
    accessToken: owner.accessToken,
    body: {
      type: 'AGENCY',
      legalName: `Agence ${label} SARL`,
      city: 'Brazzaville',
      contactPhone: phone,
    },
  });
  if (organization.status !== 201) throw new Error(JSON.stringify(organization.body));
  return { organizationId: organization.body.id, owner: { ...owner, phone } };
}

/** Ajoute un membre d'un rôle donné, directement en base, puis le connecte. */
export async function addMember(
  ctx: TestContext,
  organizationId: string,
  role: 'MANAGER' | 'COLLECTOR' | 'ACCOUNTANT' | 'VIEWER',
): Promise<{ accessToken: string; userId: string; phone: string }> {
  const phone = uniquePhone();
  const session = await login(ctx, phone);
  await ctx.admin.$executeRawUnsafe(
    `INSERT INTO organization_members (id, organization_id, user_id, role) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::member_role)`,
    uuidv7(),
    organizationId,
    session.userId,
    role,
  );
  return { ...session, phone };
}

export interface BulkPortfolio {
  landlordId: string;
  propertyId: string;
  leases: Array<{ leaseId: string; tenantId: string; unitId: string; tenantPhone: string }>;
}

/**
 * Sème `count` baux ACTIFS par SQL (rôle d'administration) : un immeuble,
 * `count` lots et locataires, un bail par lot. Beaucoup plus rapide que 500
 * appels HTTP, et suffisant : le moteur de facturation lit la base.
 */
export async function seedLeases(
  admin: PrismaClient,
  organizationId: string,
  count: number,
  options: {
    startDate: string;
    rentAmount?: number;
    chargesAmount?: number;
    dueDay?: number;
    collectorUserId?: string | null;
    phoneSuffix?: string;
  },
): Promise<BulkPortfolio> {
  const landlordId = uuidv7();
  const propertyId = uuidv7();
  const base = Math.floor(Math.random() * 8_000_000) + 1_000_000;
  await admin.$executeRawUnsafe(
    `INSERT INTO landlords (id, organization_id, last_name, primary_phone) VALUES ($1::uuid, $2::uuid, 'Bailleur Lot', $3)`,
    landlordId,
    organizationId,
    `+2420${base}0`,
  );
  await admin.$executeRawUnsafe(
    `INSERT INTO properties (id, organization_id, landlord_id, name, address_line, district)
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'Résidence Facturation', '1, avenue de la Paix', 'Poto-Poto')`,
    propertyId,
    organizationId,
    landlordId,
  );
  const rows = await admin.$queryRawUnsafe<
    Array<{ lease_id: string; tenant_id: string; unit_id: string; phone: string }>
  >(
    `WITH g AS (SELECT n FROM generate_series(1, $3::int) AS n),
     u AS (
       INSERT INTO units (id, organization_id, property_id, code)
       SELECT gen_random_uuid(), $1::uuid, $2::uuid, 'F' || lpad(n::text, 4, '0') FROM g
       RETURNING id, code
     ),
     t AS (
       INSERT INTO tenants (id, organization_id, first_name, last_name, primary_phone)
       SELECT gen_random_uuid(), $1::uuid, 'Locataire', 'F' || lpad(n::text, 4, '0'),
              '+2420' || lpad((($4::bigint % 100000) * 1000 + n)::text, 8, '0') || $10
         FROM g
       RETURNING id, last_name, primary_phone
     ),
     l AS (
       INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id, primary_tenant_id,
                           reference, status, start_date, rent_amount, charges_amount,
                           payment_due_day, grace_days, collector_user_id)
       SELECT gen_random_uuid(), $1::uuid, u.id, $2::uuid, $5::uuid, t.id,
              'BL-' || $4::text || '-' || u.code, 'ACTIVE', $6::date, $7::bigint, $8::bigint, $9::smallint, 5,
              $11::uuid
         FROM u JOIN t ON t.last_name = u.code
       RETURNING id, unit_id, primary_tenant_id
     )
     SELECT l.id AS lease_id, l.primary_tenant_id AS tenant_id, l.unit_id, t.primary_phone AS phone
       FROM l JOIN t ON t.id = l.primary_tenant_id`,
    organizationId,
    propertyId,
    count,
    String(base),
    landlordId,
    options.startDate,
    String(options.rentAmount ?? 100_000),
    String(options.chargesAmount ?? 10_000),
    options.dueDay ?? 5,
    options.phoneSuffix ?? '',
    options.collectorUserId ?? null,
  );
  return {
    landlordId,
    propertyId,
    leases: rows.map((r) => ({
      leaseId: r.lease_id,
      tenantId: r.tenant_id,
      unitId: r.unit_id,
      tenantPhone: r.phone,
    })),
  };
}

/** Attend la fin d'une campagne de facturation. */
export async function pollRun(
  ctx: TestContext,
  agency: Agency,
  runId: string,
  timeoutMs = 60_000,
): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await api(ctx, 'GET', `/billing/runs/${runId}`, {
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
    if (res.body?.status && res.body.status !== 'RUNNING') return res.body;
    if (Date.now() > deadline) throw new Error(`Campagne ${runId} non terminée.`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/** Attend qu'une condition asynchrone devienne vraie (workers BullMQ). */
export async function waitFor<T>(
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Condition non atteinte dans le délai imparti.');
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

/**
 * Supprime une organisation de test. Les déclencheurs append-only et
 * `guard_financial_row` refusent tout DELETE : ils sont neutralisés le temps
 * du nettoyage — artifice RÉSERVÉ AUX TESTS, absent du code applicatif.
 */
export async function dropOrganization(
  admin: PrismaClient,
  organizationId: string,
  userIds: string[] = [],
): Promise<void> {
  const guarded = ['audit_logs', 'payment_allocations', 'payments', 'receipts', 'cash_receipts'];
  // Enfants d'abord : plusieurs clés étrangères sont `ON DELETE RESTRICT`
  // (quittance → paiement, imputation → facture, facture → bail). Une
  // cascade unique depuis `organizations` échouerait selon l'ordre de visite.
  const childFirst = [
    'receipts',
    'cash_remittance_items',
    'cash_receipts',
    'cash_remittances',
    'payment_allocations',
    'tenant_credits',
    'message_logs',
    'notifications',
    'webhook_events',
    'payments WHERE reversal_of_id IS NOT NULL AND organization_id = $1::uuid',
    'payments',
    'invoice_lines',
    'rent_invoices',
    'deposit_movements',
    'deposits',
    'lease_parties',
    'lease_documents',
    'lease_rent_revisions',
    'leases',
  ];
  for (const table of guarded)
    await admin.$executeRawUnsafe(`ALTER TABLE ${table} DISABLE TRIGGER USER`);
  try {
    for (const target of childFirst) {
      const sql = target.includes(' WHERE ')
        ? `DELETE FROM ${target}`
        : `DELETE FROM ${target} WHERE organization_id = $1::uuid`;
      await admin.$executeRawUnsafe(sql, organizationId).catch(() => undefined);
    }
    await admin
      .$executeRawUnsafe(`DELETE FROM organizations WHERE id = $1::uuid`, organizationId)
      .catch(() => undefined);
    for (const userId of userIds) {
      await admin
        .$executeRawUnsafe(`DELETE FROM users WHERE id = $1::uuid`, userId)
        .catch(() => undefined);
    }
  } finally {
    for (const table of guarded)
      await admin.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE TRIGGER USER`);
  }
}
