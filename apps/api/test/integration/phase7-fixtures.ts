import type { PrismaClient } from '@prisma/client';
import { api, readOtpCode, resetOtpLimits, uniquePhone, type TestContext } from './helpers';
import type { Agency } from './phase3-fixtures';

/** Période AAAA-MM et bornes civiles du mois civil PRÉCÉDENT, relatives à `new Date()`. */
export function previousPeriod(): { period: string; start: string; end: string } {
  const now = new Date(Date.now() + 3_600_000); // décalage Brazzaville, voir business-date.ts
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const period = `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}`;
  return { period, start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
}

/** Milieu de la période, pour dater un paiement franchement à l'intérieur du mois. */
export function midOfPeriod(start: string): string {
  const d = new Date(`${start}T00:00:00.000Z`);
  d.setUTCDate(15);
  return d.toISOString().slice(0, 10);
}

export interface MandatePortfolioRow {
  landlordId: string;
  propertyId: string;
  mandateId: string;
  leaseId: string;
  invoiceId: string;
  paymentId: string;
  rentAmount: number;
}

const SEED_SQL = `
WITH codes AS (
  SELECT n, lpad(n::text, 5, '0') AS code FROM generate_series(1, $3::int) AS n
),
ll AS (
  INSERT INTO landlords (id, organization_id, last_name, primary_phone, payout_method, country_code)
  SELECT gen_random_uuid(), $1::uuid, 'BL' || $8 || code, '+2420' || lpad(($2::bigint + n)::text, 8, '0'), 'MOBILE_MONEY', 'CG'
  FROM codes RETURNING id, last_name
),
pr AS (
  INSERT INTO properties (id, organization_id, landlord_id, name, address_line, district)
  SELECT gen_random_uuid(), $1::uuid, ll.id, 'IM' || $8 || c.code, '1 rue Test ' || c.code, 'Bacongo'
  FROM codes c JOIN ll ON ll.last_name = 'BL' || $8 || c.code RETURNING id, name, landlord_id
),
un AS (
  INSERT INTO units (id, organization_id, property_id, code)
  SELECT gen_random_uuid(), $1::uuid, pr.id, 'U' || $8 || c.code
  FROM codes c JOIN pr ON pr.name = 'IM' || $8 || c.code RETURNING id, code, property_id
),
tn AS (
  INSERT INTO tenants (id, organization_id, last_name, primary_phone)
  SELECT gen_random_uuid(), $1::uuid, 'LOC' || $8 || c.code, '+2421' || lpad(($2::bigint + n)::text, 8, '0')
  FROM codes c RETURNING id, last_name
),
ls AS (
  INSERT INTO leases (id, organization_id, unit_id, property_id, landlord_id, primary_tenant_id,
                       reference, status, start_date, rent_amount)
  SELECT gen_random_uuid(), $1::uuid, un.id, un.property_id, pr.landlord_id, tn.id,
         'BLS' || $8 || c.code, 'ACTIVE', $4::date, $5::bigint
  FROM codes c
  JOIN un ON un.code = 'U' || $8 || c.code
  JOIN pr ON pr.id = un.property_id
  JOIN tn ON tn.last_name = 'LOC' || $8 || c.code
  RETURNING id, reference, unit_id, property_id, landlord_id, primary_tenant_id
),
inv AS (
  INSERT INTO rent_invoices (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id,
    invoice_number, status, period_start, period_end, due_date, issue_date, issued_at,
    rent_amount, total_amount, balance_amount, paid_amount)
  SELECT gen_random_uuid(), $1::uuid, ls.id, ls.primary_tenant_id, ls.unit_id, ls.property_id, ls.landlord_id,
    'LOYT' || $8 || c.code, 'ISSUED', $4::date, $6::date, $6::date, $4::date, now(),
    $5::bigint, $5::bigint, 0, $5::bigint
  FROM codes c JOIN ls ON ls.reference = 'BLS' || $8 || c.code
  RETURNING id, lease_id, landlord_id, property_id, invoice_number
),
pay AS (
  INSERT INTO payments (id, organization_id, tenant_id, method, status, reference, amount,
    allocated_amount, payment_date)
  SELECT gen_random_uuid(), $1::uuid, ls.primary_tenant_id, 'CASH', 'CONFIRMED',
    'PAYT' || $8 || c.code, $5::bigint, $5::bigint, $7::date
  FROM codes c JOIN ls ON ls.reference = 'BLS' || $8 || c.code
  RETURNING id, reference
),
alloc AS (
  INSERT INTO payment_allocations (id, organization_id, payment_id, invoice_id, amount, allocation_date)
  SELECT gen_random_uuid(), $1::uuid, pay.id, inv.id, $5::bigint, $7::date
  FROM codes c
  JOIN pay ON pay.reference = 'PAYT' || $8 || c.code
  JOIN inv ON inv.invoice_number = 'LOYT' || $8 || c.code
  RETURNING id, invoice_id
),
mnd AS (
  INSERT INTO management_mandates (id, organization_id, landlord_id, property_id, reference, scope, status,
    start_date, commission_basis, commission_rate_bps, vat_rate_bps, payout_day, signed_at)
  SELECT gen_random_uuid(), $1::uuid, pr.landlord_id, pr.id, 'MDT' || $8 || c.code, 'FULL_MANAGEMENT', 'ACTIVE',
    $4::date, 'RATE_BPS_ON_RENT_COLLECTED', 1000, 0, 10, now()
  FROM codes c JOIN pr ON pr.name = 'IM' || $8 || c.code
  RETURNING id, landlord_id, property_id
)
SELECT ll.id AS landlord_id, pr.id AS property_id, ls.id AS lease_id, inv.id AS invoice_id,
       pay.id AS payment_id, mnd.id AS mandate_id
FROM codes c
JOIN ll ON ll.last_name = 'BL' || $8 || c.code
JOIN pr ON pr.landlord_id = ll.id
JOIN ls ON ls.reference = 'BLS' || $8 || c.code
JOIN inv ON inv.invoice_number = 'LOYT' || $8 || c.code
JOIN pay ON pay.reference = 'PAYT' || $8 || c.code
JOIN alloc ON alloc.invoice_id = inv.id
JOIN mnd ON mnd.landlord_id = ll.id
ORDER BY c.n`;

/**
 * Sème `count` mandats ACTIFS mono-bien par SQL direct (rôle d'administration,
 * bien plus rapide que `count` appels HTTP — voir `phase3-fixtures.seedLeases`,
 * même principe) : un bailleur, un bien, un bail ACTIF, une facture ISSUED et
 * un paiement CONFIRMED déjà imputé (`payment_allocations`) par mandat.
 *
 * `payments.lease_id` est volontairement laissé NUL (comme un encaissement
 * au comptoir réel) : le rattachement au bailleur passe entièrement par
 * `payment_allocations.invoice_id → rent_invoices.landlord_id`, exactement ce
 * que `CommissionsService.accrueForPeriod` est censé exploiter.
 *
 * Commission 10 % sans TVA (`vat_rate_bps = 0`) : net attendu = loyer × 0,9.
 */
export async function seedMandatePortfolio(
  admin: PrismaClient,
  organizationId: string,
  count: number,
  period: { start: string; end: string },
  options: { rentAmount?: number; salt?: string } = {},
): Promise<MandatePortfolioRow[]> {
  const rentAmount = options.rentAmount ?? 100_000;
  const salt = options.salt ?? Math.random().toString(36).slice(2, 6);
  const mid = midOfPeriod(period.start);
  const phoneBase = Math.floor(Math.random() * 8_000_000) + 1_000_000;

  const rows = await admin.$queryRawUnsafe<
    Array<{
      landlord_id: string;
      property_id: string;
      lease_id: string;
      invoice_id: string;
      payment_id: string;
      mandate_id: string;
    }>
  >(
    SEED_SQL,
    organizationId,
    String(phoneBase),
    count,
    period.start,
    String(rentAmount),
    period.end,
    mid,
    salt,
  );

  return rows.map((r) => ({
    landlordId: r.landlord_id,
    propertyId: r.property_id,
    leaseId: r.lease_id,
    invoiceId: r.invoice_id,
    paymentId: r.payment_id,
    mandateId: r.mandate_id,
    rentAmount,
  }));
}

/** Attend la fin d'une campagne de relevés de gérance. */
export async function pollStatementRun(
  ctx: TestContext,
  agency: Agency,
  runId: string,
  timeoutMs = 60_000,
): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await api(ctx, 'GET', `/owner-statements/runs/${runId}`, {
      accessToken: agency.owner.accessToken,
      organizationId: agency.organizationId,
    });
    if (res.body?.status && res.body.status !== 'RUNNING') return res.body;
    if (Date.now() > deadline) throw new Error(`Campagne ${runId} non terminée.`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

/** Crée un bailleur et un bien via l'API réelle (scénarios unitaires, hors volumétrie). */
export async function createLandlordAndProperty(
  ctx: TestContext,
  agency: Agency,
  labelSuffix: string,
): Promise<{ landlordId: string; propertyId: string }> {
  const as = { accessToken: agency.owner.accessToken, organizationId: agency.organizationId };
  const landlord = await api(ctx, 'POST', '/landlords', {
    ...as,
    body: { lastName: `Bailleur ${labelSuffix}`, primaryPhone: uniquePhone() },
  });
  if (landlord.status !== 201) throw new Error(`landlord: ${JSON.stringify(landlord.body)}`);

  const property = await api(ctx, 'POST', '/properties', {
    ...as,
    body: {
      landlordId: landlord.body.id,
      name: `Résidence ${labelSuffix}`,
      addressLine: '1, avenue de test',
      district: 'Bacongo',
    },
  });
  if (property.status !== 201) throw new Error(`property: ${JSON.stringify(property.body)}`);
  return { landlordId: landlord.body.id, propertyId: property.body.id };
}

/**
 * Cycle complet d'activation du portail bailleur (`POST /portal/activation/
 * otp/request` puis `/verify`) : calqué sur `login()` de `helpers.ts`, mais
 * pour le flux portail, qui exige une fiche `landlords` en attente
 * (`user_id IS NULL`) pour ce numéro avant toute demande d'OTP.
 */
export async function portalLogin(
  ctx: TestContext,
  phone: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  await resetOtpLimits(ctx, phone);

  const requested = await api(ctx, 'POST', '/portal/activation/otp/request', {
    body: { phone },
  });
  if (requested.status !== 201) {
    throw new Error(`Demande d'OTP portail en échec : ${JSON.stringify(requested.body)}`);
  }

  const code = await readOtpCode(ctx, phone);
  const verified = await api(ctx, 'POST', '/portal/activation/otp/verify', {
    body: { phone, code, deviceName: 'Test intégration portail' },
  });
  if (verified.status !== 200) {
    throw new Error(`Vérification d'OTP portail en échec : ${JSON.stringify(verified.body)}`);
  }
  return { accessToken: verified.body.accessToken, refreshToken: verified.body.refreshToken };
}
