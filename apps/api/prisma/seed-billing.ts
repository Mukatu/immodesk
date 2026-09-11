/**
 * Facturation, encaissements et messagerie de démonstration — phase 3.
 *
 * Idempotent : chaque objet est retrouvé (facture par bail et période,
 * paiement par `client_ref`) avant d'être créé, et les numéros sont réservés
 * par `next_sequence` comme en production. Décor : les deux baux actifs A1 et
 * A2 de la phase 2 (Résidence Mpila).
 */
import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import { SYSTEM_TEMPLATES } from '../src/modules/notifications/domain/template-catalog';
import { cashReceiptPrefix } from '../src/modules/numbering/domain/sequence-kind';
import { mergeOperationalSettings } from '../src/shared/settings/operational-settings';

export interface BillingReport {
  invoices: number;
  payments: number;
  receipts: number;
  cashReceipts: number;
  remittances: number;
  templates: number;
}

const now = new Date(Date.now() + 3_600_000);
const Y = now.getUTCFullYear();
const M = now.getUTCMonth();
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

export async function seedBilling(
  prisma: PrismaClient,
  organizationId: string,
): Promise<BillingReport> {
  const report: BillingReport = {
    invoices: 0,
    payments: 0,
    receipts: 0,
    cashReceipts: 0,
    remittances: 0,
    templates: 0,
  };

  report.templates = (
    await prisma.notification_templates.createMany({
      data: SYSTEM_TEMPLATES.map((t) => ({
        id: uuidv7(),
        organization_id: organizationId,
        code: t.code,
        channel: t.channel,
        locale: 'fr-CG',
        name: t.name,
        body: t.body,
        provider_template_name: t.providerTemplateName,
        provider_template_lang: t.providerTemplateLang,
        variables: t.variables,
        is_active: true,
        is_system: true,
      })),
      skipDuplicates: true,
    })
  ).count;

  const ruleName = 'Retard standard — 5 % par mois';
  const rule =
    (await prisma.penalty_rules.findFirst({
      where: { organization_id: organizationId, name: ruleName },
    })) ??
    (await prisma.penalty_rules.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        name: ruleName,
        basis: 'RATE_BPS_PER_MONTH',
        rate_bps: 500,
        grace_days: 5,
        cap_rate_bps: 2000,
        max_periods: 4,
        is_default: true,
      },
    }));
  const settings = await prisma.organization_settings.findUniqueOrThrow({
    where: { organization_id: organizationId },
  });
  await prisma.organization_settings.update({
    where: { organization_id: organizationId },
    data: {
      settings_json: mergeOperationalSettings(settings.settings_json, {
        billing: { defaultPenaltyRuleId: rule.id },
      }) as object,
      default_penalty_rule_id: rule.id,
      updated_at: new Date(),
    },
  });

  const organization = await prisma.organizations.findUniqueOrThrow({
    where: { id: organizationId },
  });
  const collector = await prisma.users.findUniqueOrThrow({
    where: { phone_e164: '+242066000002' },
  });
  const a1 = await prisma.leases.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a1' },
  });
  const a2 = await prisma.leases.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a2' },
  });

  // --- A1 : mois précédent RÉGLÉ (Mobile Money) et quittancé ------------
  const previous = await upsertInvoice(prisma, organizationId, a1, day(Y, M - 1, 1), 'PAID', []);
  report.invoices += previous.created ? 1 : 0;
  const momo = await upsertPayment(
    prisma,
    organizationId,
    a1,
    'seed-pay-a1-momo',
    'MOBILE_MONEY',
    previous.total,
    day(Y, M - 1, 4),
    null,
  );
  if (momo.created) {
    report.payments += 1;
    await allocate(prisma, organizationId, momo.id, previous.id, previous.total, day(Y, M - 1, 4));
    await upsertReceipt(prisma, organizationId, a1, previous, momo.id);
    report.receipts += 1;
  }

  // --- A1 : mois courant ÉMIS --------------------------------------------
  report.invoices += (await upsertInvoice(prisma, organizationId, a1, day(Y, M, 1), 'ISSUED', []))
    .created
    ? 1
    : 0;

  // --- A2 : mois courant PARTIELLEMENT RÉGLÉ par 100 000 FCFA en espèces --
  const repair = { label: 'Remplacement de la serrure (refacturation)', amount: 40_000n };
  const a2Invoice = await upsertInvoice(
    prisma,
    organizationId,
    a2,
    day(Y, M, 1),
    'PARTIALLY_PAID',
    [repair],
  );
  report.invoices += a2Invoice.created ? 1 : 0;
  const cash = await upsertPayment(
    prisma,
    organizationId,
    a2,
    'seed-pay-a2-cash',
    'CASH',
    100_000n,
    day(Y, M, now.getUTCDate()),
    collector.id,
  );
  if (cash.created) {
    report.payments += 1;
    await allocate(
      prisma,
      organizationId,
      cash.id,
      a2Invoice.id,
      100_000n,
      day(Y, M, now.getUTCDate()),
    );
    const cashReceiptId = uuidv7();
    const number = await next(
      prisma,
      organizationId,
      `CASH_RECEIPT:${collector.id}`,
      '',
      cashReceiptPrefix(organization.slug, collector.id),
      6,
    );
    await prisma.cash_receipts.create({
      data: {
        id: cashReceiptId,
        organization_id: organizationId,
        payment_id: cash.id,
        lease_id: a2.id,
        tenant_id: a2.primary_tenant_id,
        collector_user_id: collector.id,
        receipt_number: number,
        status: 'ISSUED',
        amount: 100_000n,
        payer_name: 'Locataire du lot A2',
        purpose: 'Loyer du mois en cours (versement partiel)',
        client_ref: 'seed-cash-a2',
      },
    });
    report.cashReceipts += 1;

    // --- Remise SOUMISE par le démarcheur ---------------------------------
    const remittanceId = uuidv7();
    await prisma.cash_remittances.create({
      data: {
        id: remittanceId,
        organization_id: organizationId,
        collector_user_id: collector.id,
        reference: await next(prisma, organizationId, 'REMITTANCE', ym(now), 'REM'),
        status: 'SUBMITTED',
        submitted_at: new Date(),
        declared_amount: 100_000n,
        expected_amount: 100_000n,
        receipts_count: 1,
        denominations: { '10000': 10 },
        client_ref: 'seed-remise-a2',
      },
    });
    await prisma.cash_remittance_items.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        remittance_id: remittanceId,
        cash_receipt_id: cashReceiptId,
        payment_id: cash.id,
        amount: 100_000n,
      },
    });
    await prisma.cash_receipts.update({
      where: { id: cashReceiptId },
      data: { remittance_id: remittanceId },
    });
    report.remittances += 1;
  }
  return report;
}

type Lease = {
  id: string;
  primary_tenant_id: string;
  unit_id: string;
  property_id: string;
  landlord_id: string;
  rent_amount: bigint;
  charges_amount: bigint;
  payment_due_day: number;
  grace_days: number;
};
type SeededInvoice = {
  id: string;
  created: boolean;
  total: bigint;
  number: string;
  periodStart: Date;
  periodEnd: Date;
  rent: bigint;
  charges: bigint;
};

async function upsertInvoice(
  prisma: PrismaClient,
  org: string,
  lease: Lease,
  periodStart: Date,
  status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID',
  extras: Array<{ label: string; amount: bigint }>,
): Promise<SeededInvoice> {
  const periodEnd = day(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0);
  const extra = extras.reduce((t, e) => t + e.amount, 0n);
  const total = lease.rent_amount + lease.charges_amount + extra;
  const existing = await prisma.rent_invoices.findFirst({
    where: { lease_id: lease.id, period_start: periodStart },
  });
  const base = {
    total,
    periodStart,
    periodEnd,
    rent: lease.rent_amount,
    charges: lease.charges_amount,
  };
  if (existing)
    return { ...base, id: existing.id, created: false, number: existing.invoice_number };

  const id = uuidv7();
  const number = await next(prisma, org, 'RENT_INVOICE', ym(periodStart), 'LOY');
  const due = day(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), lease.payment_due_day);
  const paid = status === 'PAID' ? total : status === 'PARTIALLY_PAID' ? 100_000n : 0n;
  await prisma.rent_invoices.create({
    data: {
      id,
      organization_id: org,
      lease_id: lease.id,
      tenant_id: lease.primary_tenant_id,
      unit_id: lease.unit_id,
      property_id: lease.property_id,
      landlord_id: lease.landlord_id,
      invoice_number: number,
      status,
      period_start: periodStart,
      period_end: periodEnd,
      issue_date: day(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1),
      due_date: due,
      grace_until_date: day(
        due.getUTCFullYear(),
        due.getUTCMonth(),
        due.getUTCDate() + lease.grace_days,
      ),
      rent_amount: lease.rent_amount,
      charges_amount: lease.charges_amount,
      other_amount: extra,
      total_amount: total,
      paid_amount: paid,
      balance_amount: total - paid,
      issued_at: new Date(),
      paid_at: status === 'PAID' ? new Date() : null,
      generated_by_job: 'seed',
    },
  });
  const lines = [
    { line_type: 'RENT' as const, label: 'Loyer', amount: lease.rent_amount },
    { line_type: 'SERVICE_CHARGE' as const, label: 'Charges', amount: lease.charges_amount },
    ...extras.map((e) => ({
      line_type: 'REPAIR_REBILL' as const,
      label: e.label,
      amount: e.amount,
    })),
  ];
  await prisma.invoice_lines.createMany({
    data: lines.map((l, i) => ({
      id: uuidv7(),
      organization_id: org,
      invoice_id: id,
      line_type: l.line_type,
      label: l.label,
      quantity: '1.000',
      unit_price_amount: l.amount,
      amount: l.amount,
      position: i + 1,
    })),
  });
  return { ...base, id, created: true, number };
}

async function upsertPayment(
  prisma: PrismaClient,
  org: string,
  lease: Lease,
  clientRef: string,
  method: 'CASH' | 'MOBILE_MONEY',
  amount: bigint,
  date: Date,
  collectorId: string | null,
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.payments.findFirst({
    where: { organization_id: org, client_ref: clientRef },
  });
  if (existing) return { id: existing.id, created: false };
  const id = uuidv7();
  await prisma.payments.create({
    data: {
      id,
      organization_id: org,
      tenant_id: lease.primary_tenant_id,
      lease_id: lease.id,
      landlord_id: lease.landlord_id,
      method,
      status: 'CONFIRMED',
      reference: await next(prisma, org, 'PAYMENT', ym(date), 'PAY'),
      amount,
      net_amount: amount,
      allocated_amount: amount,
      unallocated_amount: 0n,
      payment_date: date,
      received_by_user_id: collectorId,
      external_reference: method === 'MOBILE_MONEY' ? 'MP260904.0931.B41275' : null,
      confirmed_at: new Date(),
      client_ref: clientRef,
    },
  });
  return { id, created: true };
}

async function allocate(
  prisma: PrismaClient,
  org: string,
  paymentId: string,
  invoiceId: string,
  amount: bigint,
  date: Date,
): Promise<void> {
  await prisma.payment_allocations.create({
    data: {
      id: uuidv7(),
      organization_id: org,
      payment_id: paymentId,
      invoice_id: invoiceId,
      amount,
      allocation_date: date,
      allocation_order: 1,
    },
  });
}

async function upsertReceipt(
  prisma: PrismaClient,
  org: string,
  lease: Lease,
  invoice: SeededInvoice,
  paymentId: string,
): Promise<void> {
  const token = randomBytes(16).toString('hex');
  const url = `${process.env.PUBLIC_WEB_BASE_URL ?? 'https://app.immodesk.cg'}/verifier/${token}`;
  await prisma.receipts.create({
    data: {
      id: uuidv7(),
      organization_id: org,
      payment_id: paymentId,
      invoice_id: invoice.id,
      lease_id: lease.id,
      tenant_id: lease.primary_tenant_id,
      landlord_id: lease.landlord_id,
      unit_id: lease.unit_id,
      receipt_number: await next(prisma, org, 'RECEIPT', ym(invoice.periodStart), 'QUI'),
      status: 'ISSUED',
      period_start: invoice.periodStart,
      period_end: invoice.periodEnd,
      issue_date: day(invoice.periodStart.getUTCFullYear(), invoice.periodStart.getUTCMonth(), 4),
      rent_amount: invoice.rent,
      charges_amount: invoice.charges,
      total_amount: invoice.total,
      remaining_balance_amount: 0n,
      verification_token: token,
      verification_url: url,
      qr_payload: url,
      generated_at: new Date(),
      generated_by_job: 'seed',
    },
  });
}
