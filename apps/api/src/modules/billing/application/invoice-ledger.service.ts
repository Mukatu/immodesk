import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  assertInvoiceTransition,
  OPEN_INVOICE_STATUSES,
  settlementStatus,
  type InvoiceStatus,
} from '../domain/invoice-status';
import type { InvoiceRow } from './invoice-views';

/**
 * Grand livre des factures : SEUL point d'écriture de `paid_amount`,
 * `balance_amount` et du statut d'encaissement d'une facture.
 *
 * Le module `payments` impute et contre-passe à travers ce service : la
 * facture reste la propriété du module `billing`, et la règle « montant payé
 * dérivé des affectations, jamais saisi » tient en un seul endroit.
 */
@Injectable()
export class InvoiceLedgerService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Factures ouvertes d'un locataire, verrouillées, de la plus ancienne
   * échéance à la plus récente : l'ordre même de l'imputation automatique.
   */
  async lockOpenForTenant(tx: TenantClient, tenantId: string): Promise<InvoiceRow[]> {
    return tx.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM rent_invoices
        WHERE tenant_id = $1::uuid
          AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
          AND balance_amount > 0
        ORDER BY due_date, period_start, created_at, id
        FOR UPDATE`,
      tenantId,
    );
  }

  /** Verrouille des factures dans un ordre stable (identifiant) : aucun interblocage. */
  async lockByIds(tx: TenantClient, ids: readonly string[]): Promise<InvoiceRow[]> {
    if (ids.length === 0) return [];
    return tx.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM rent_invoices WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [...new Set(ids)],
    );
  }

  /** Impute `amount` sur la facture ; renvoie la ligne à jour. */
  async applyAmount(
    tx: TenantClient,
    invoice: InvoiceRow,
    amount: bigint,
    today: Date,
    paymentId: string,
  ): Promise<InvoiceRow> {
    const status = invoice.status as InvoiceStatus;
    if (!OPEN_INVOICE_STATUSES.includes(status)) {
      throw new DomainError('PAYMENTS.INVOICE_NOT_OPEN', { invoiceId: invoice.id, status });
    }
    const paid = invoice.paid_amount + amount;
    if (amount <= 0n || paid > invoice.total_amount) {
      throw new DomainError('PAYMENTS.OVER_ALLOCATED', {
        invoiceId: invoice.id,
        balanceAmount: invoice.balance_amount.toString(),
        requested: amount.toString(),
      });
    }
    return this.write(tx, invoice, paid, today, paymentId, 'ALLOCATION');
  }

  /** Retire `amount` d'une facture (contre-passation). */
  async revertAmount(
    tx: TenantClient,
    invoice: InvoiceRow,
    amount: bigint,
    today: Date,
    paymentId: string,
  ): Promise<InvoiceRow> {
    const paid = invoice.paid_amount - amount;
    if (amount <= 0n || paid < 0n) {
      throw new DomainError('PAYMENTS.OVER_ALLOCATED', {
        invoiceId: invoice.id,
        paidAmount: invoice.paid_amount.toString(),
        requested: amount.toString(),
      });
    }
    return this.write(tx, invoice, paid, today, paymentId, 'REVERSAL');
  }

  private async write(
    tx: TenantClient,
    invoice: InvoiceRow,
    paid: bigint,
    today: Date,
    paymentId: string,
    trigger: 'ALLOCATION' | 'REVERSAL',
  ): Promise<InvoiceRow> {
    const status = invoice.status as InvoiceStatus;
    const next = settlementStatus({
      current: status,
      totalAmount: invoice.total_amount,
      paidAmount: paid,
      graceUntilDate: invoice.grace_until_date,
      today,
    });
    if (next !== status) assertInvoiceTransition(status, next);

    const rows = await tx.$queryRawUnsafe<InvoiceRow[]>(
      `UPDATE rent_invoices
          SET paid_amount = $2::bigint,
              balance_amount = total_amount - $2::bigint,
              status = $3::invoice_status,
              paid_at = CASE WHEN $3::text = 'PAID' THEN coalesce(paid_at, now()) ELSE NULL END,
              updated_at = now()
        WHERE id = $1::uuid
        RETURNING *`,
      invoice.id,
      paid.toString(),
      next,
    );
    const updated = rows[0];

    if (next !== status) {
      await audit(this.auditService, tx, {
        organizationId: invoice.organization_id,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INVOICE_STATUS_CHANGED,
        entityType: 'rent_invoices',
        entityId: invoice.id,
        previousState: toJsonState({ status, paidAmount: invoice.paid_amount }),
        newState: toJsonState({ status: next, paidAmount: paid, paymentId, trigger }),
      });
    }
    return updated;
  }
}
