import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { seedLeases, type BulkPortfolio } from './phase3-fixtures';

export interface SeededInvoice {
  leaseId: string;
  tenantId: string;
  unitId: string;
  invoiceId: string;
  amount: number;
}

/**
 * Sème `count` baux ACTIFS pour un démarcheur donné, chacun porteur d'une
 * facture de loyer ISSUED du même montant — le périmètre minimal nécessaire
 * pour encaisser en espèces via `mobile-sync`.
 */
export async function seedOpenInvoices(
  admin: PrismaClient,
  organizationId: string,
  count: number,
  options: { startDate: string; collectorUserId: string; amount?: number; phoneSuffix?: string },
): Promise<{ portfolio: BulkPortfolio; invoices: SeededInvoice[] }> {
  const amount = options.amount ?? 50_000;
  const portfolio = await seedLeases(admin, organizationId, count, {
    startDate: options.startDate,
    rentAmount: amount,
    chargesAmount: 0,
    dueDay: 5,
    collectorUserId: options.collectorUserId,
    phoneSuffix: options.phoneSuffix,
  });

  const invoices: SeededInvoice[] = [];
  for (const lease of portfolio.leases) {
    const invoiceId = uuidv7();
    await admin.$executeRawUnsafe(
      `INSERT INTO rent_invoices
         (id, organization_id, lease_id, tenant_id, unit_id, property_id, landlord_id,
          invoice_number, status, period_start, period_end, due_date,
          rent_amount, total_amount, balance_amount)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8,
               'ISSUED', current_date, current_date + 29, current_date + 5,
               $9::bigint, $9::bigint, $9::bigint)`,
      invoiceId,
      organizationId,
      lease.leaseId,
      lease.tenantId,
      lease.unitId,
      portfolio.propertyId,
      portfolio.landlordId,
      // NB : les UUID v7 sont ordonnés dans le temps — tronquer leur PRÉFIXE
      // pour construire un numéro « lisible » créerait des collisions entre
      // identifiants générés dans la même milliseconde. Le suffixe (partie
      // aléatoire) est en revanche unique.
      `SYNC-INV-${invoiceId.slice(-12)}`,
      String(amount),
    );
    invoices.push({
      leaseId: lease.leaseId,
      tenantId: lease.tenantId,
      unitId: lease.unitId,
      invoiceId,
      amount,
    });
  }
  return { portfolio, invoices };
}

/** Simule une annulation survenue côté serveur pendant que l'appareil était hors ligne. */
export async function cancelInvoice(admin: PrismaClient, invoiceId: string): Promise<void> {
  await admin.$executeRawUnsafe(
    `UPDATE rent_invoices SET status = 'CANCELLED', cancelled_at = now(), updated_at = now() WHERE id = $1::uuid`,
    invoiceId,
  );
}

export function ulid(seed: string): string {
  // ULID factice mais unique et lisible pour les tests (26 caractères).
  return `01J${seed.replace(/-/g, '').slice(0, 23).toUpperCase().padEnd(23, '0')}`;
}
