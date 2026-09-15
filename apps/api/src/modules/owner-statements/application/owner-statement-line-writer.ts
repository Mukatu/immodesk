import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import type { OwnerStatementLineType } from '../domain/owner-statement-rules';

export interface StatementLineInput {
  lineType: OwnerStatementLineType;
  label: string;
  amount: bigint;
  isDebit: boolean;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
  invoiceId?: string | null;
  paymentId?: string | null;
  expenseId?: string | null;
  commissionId?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
}

/**
 * Insère les lignes d'un relevé, dans l'ordre reçu (`position` croissante).
 * Isolé de `OwnerStatementsCampaignService` pour garder ce dernier lisible :
 * cette fonction ne décide rien, elle écrit ce qu'on lui donne.
 */
export async function insertStatementLines(
  tx: TenantClient,
  organizationId: string,
  statementId: string,
  lines: readonly StatementLineInput[],
): Promise<void> {
  let position = 0;
  for (const line of lines) {
    await tx.owner_statement_lines.create({
      data: {
        id: newId(),
        organization_id: organizationId,
        statement_id: statementId,
        line_type: line.lineType as never,
        label: line.label,
        property_id: line.propertyId ?? null,
        unit_id: line.unitId ?? null,
        lease_id: line.leaseId ?? null,
        tenant_id: line.tenantId ?? null,
        invoice_id: line.invoiceId ?? null,
        payment_id: line.paymentId ?? null,
        expense_id: line.expenseId ?? null,
        commission_id: line.commissionId ?? null,
        period_start: line.periodStart ?? null,
        period_end: line.periodEnd ?? null,
        amount: line.amount,
        is_debit: line.isDebit,
        currency: 'XAF',
        position: position++,
      },
    });
  }
}
