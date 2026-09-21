import { Prisma } from '@prisma/client';
import { newId } from '../../../shared/ids/uuid';
import { toIsoDate } from '../../leases/domain/calendar';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, type AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import type { NumberingService } from '../../numbering/application/numbering.service';
import {
  computeSubscriptionInvoiceAmounts,
  type SubscriptionPriceInput,
} from '../domain/subscription-pricing';

export interface IssueSubscriptionInvoiceInput {
  organizationId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  unitsCount: number;
  pricing: SubscriptionPriceInput & { vatRateBps: number };
  today: Date;
}

/**
 * Émet la facture d'une période, ou renvoie la facture déjà émise pour cette
 * période (contrat, § « Facturation ») : `UNIQUE (subscription_id,
 * period_start)` rend la campagne idempotente PAR CONSTRUCTION — une seconde
 * exécution sur la même période ne produit jamais de doublon.
 *
 * Statut toujours ISSUED : une facture d'abonnement ne connaît que
 * ISSUED/PAID/OVERDUE/CANCELLED (contrat, arbitrage 2), jamais DRAFT.
 */
export async function issueSubscriptionInvoice(
  tx: TenantClient,
  numbering: NumberingService,
  auditService: AuditService,
  input: IssueSubscriptionInvoiceInput,
): Promise<{ id: string; created: boolean }> {
  const existing = await tx.subscription_invoices.findUnique({
    where: {
      subscription_id_period_start: {
        subscription_id: input.subscriptionId,
        period_start: input.periodStart,
      },
    },
  });
  if (existing) return { id: existing.id, created: false };

  const amounts = computeSubscriptionInvoiceAmounts(input.pricing);
  const id = newId();
  const { number } = await numbering.nextNumber(
    tx,
    input.organizationId,
    'SUBSCRIPTION_INVOICE',
    input.today,
  );

  try {
    await tx.subscription_invoices.create({
      data: {
        id,
        organization_id: input.organizationId,
        subscription_id: input.subscriptionId,
        invoice_number: number,
        status: 'ISSUED',
        period_start: input.periodStart,
        period_end: input.periodEnd,
        due_date: input.dueDate,
        units_count: input.unitsCount,
        subtotal_amount: amounts.subtotalAmount,
        discount_amount: amounts.discountAmount,
        vat_rate_bps: input.pricing.vatRateBps,
        vat_amount: amounts.vatAmount,
        total_amount: amounts.totalAmount,
      },
    });
  } catch (error) {
    // Course entre deux exécutions concurrentes de la campagne : la
    // contrainte unique gagne, on relit la ligne déjà posée par l'autre.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await tx.subscription_invoices.findUniqueOrThrow({
        where: {
          subscription_id_period_start: {
            subscription_id: input.subscriptionId,
            period_start: input.periodStart,
          },
        },
      });
      return { id: raced.id, created: false };
    }
    throw error;
  }

  await audit(auditService, tx, {
    organizationId: input.organizationId,
    action: 'CREATE',
    operation: AUDIT_OPERATIONS.SUBSCRIPTION_INVOICE_ISSUED,
    entityType: 'subscription_invoices',
    entityId: id,
    newState: toJsonState({
      periodStart: toIsoDate(input.periodStart),
      periodEnd: toIsoDate(input.periodEnd),
      totalAmount: amounts.totalAmount,
    }),
  });
  return { id, created: true };
}
