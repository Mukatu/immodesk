import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { publicInvoiceNumber } from '../../billing/application/invoice-views';
import { toIsoDate } from '../../leases/domain/calendar';

export type StatementLineType = 'INVOICE' | 'PAYMENT' | 'REVERSAL' | 'CREDIT';

interface LedgerEntry {
  entry_date: Date;
  created_at: Date;
  type: StatementLineType;
  reference: string;
  debit: bigint;
  credit: bigint;
}

export interface TenantStatementView {
  openingBalance: number;
  lines: Array<{
    date: string;
    type: StatementLineType;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  closingBalance: number;
}

/**
 * Relevé de compte locataire : factures émises au débit, règlements confirmés
 * au crédit, contre-passations au débit, avoirs hors trop-perçu au crédit
 * (un trop-perçu est déjà compris dans le règlement qui l'a produit).
 * Solde positif = le locataire doit, négatif = il dispose d'un avoir.
 */
@Injectable()
export class TenantStatementService {
  constructor(private readonly prisma: PrismaService) {}

  async statement(
    organizationId: string,
    userId: string,
    tenantId: string,
    range: { from?: string; to?: string },
  ): Promise<TenantStatementView> {
    const to = range.to ? range.to.slice(0, 10) : toIsoDate(businessToday());
    const from = range.from ? range.from.slice(0, 10) : '0001-01-01';

    const entries = await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const tenant = await tx.tenants.findFirst({ where: { id: tenantId }, select: { id: true } });
      if (!tenant) throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId });
      return tx.$queryRawUnsafe<LedgerEntry[]>(
        `SELECT * FROM (
           SELECT ri.issue_date AS entry_date, ri.created_at, 'INVOICE' AS type,
                  ri.invoice_number AS reference, ri.total_amount AS debit, 0::bigint AS credit
             FROM rent_invoices ri
            WHERE ri.tenant_id = $1::uuid AND ri.status NOT IN ('DRAFT', 'CANCELLED')
           UNION ALL
           SELECT pm.payment_date, pm.created_at, 'PAYMENT', pm.reference, 0::bigint, pm.amount
             FROM payments pm
            WHERE pm.tenant_id = $1::uuid AND pm.direction = 'INBOUND' AND pm.status = 'CONFIRMED'
           UNION ALL
           SELECT pm.payment_date, pm.created_at, 'REVERSAL', pm.reference, pm.amount, 0::bigint
             FROM payments pm
            WHERE pm.tenant_id = $1::uuid AND pm.direction = 'OUTBOUND' AND pm.status = 'REVERSED'
           UNION ALL
           SELECT tc.created_at::date, tc.created_at, 'CREDIT', coalesce(tc.reason, tc.origin), 0::bigint, tc.amount
             FROM tenant_credits tc
            WHERE tc.tenant_id = $1::uuid AND tc.origin <> 'OVERPAYMENT' AND tc.status <> 'REFUNDED'
         ) ledger
         WHERE entry_date <= $2::date
         ORDER BY entry_date, created_at`,
        tenantId,
        to,
      );
    });

    let opening = 0n;
    let balance = 0n;
    const lines: TenantStatementView['lines'] = [];
    for (const entry of entries) {
      const date = toIsoDate(entry.entry_date);
      balance += entry.debit - entry.credit;
      if (date < from) {
        opening = balance;
        continue;
      }
      lines.push({
        date,
        type: entry.type,
        reference:
          entry.type === 'INVOICE'
            ? (publicInvoiceNumber(entry.reference) ?? entry.reference)
            : entry.reference,
        debit: toJsonAmount(entry.debit),
        credit: toJsonAmount(entry.credit),
        balance: toJsonAmount(balance),
      });
    }
    return { openingBalance: toJsonAmount(opening), lines, closingBalance: toJsonAmount(balance) };
  }
}
