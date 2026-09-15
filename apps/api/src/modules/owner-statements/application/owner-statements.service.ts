import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { CommissionsService } from '../../commissions/application/commissions.service';
import { EXPENSE_READER, type ExpenseReader } from '../../expenses/domain/ports';
import {
  assertCancellable,
  assertIssuable,
  assertPayable,
  type StatementStatus,
} from '../domain/owner-statement-rules';
import { OwnerStatementDocumentsPipeline } from '../infrastructure/owner-statement-documents.pipeline';
import type { OwnerStatementRow } from './owner-statement-views';

/**
 * Machine à états des relevés (contrat, § Machine à états) : propriétaire
 * exclusif de `owner_statements` avec `OwnerStatementsCampaignService` (qui
 * les CRÉE) — ce service gère uniquement les transitions DRAFT → ISSUED →
 * SENT → PAID et DRAFT/ISSUED → CANCELLED.
 *
 * `markPaid` est le point d'entrée exposé au FUTUR module `owner-payouts`
 * (pas construit) : appel direct de service à service, `OwnerStatementsModule`
 * étant `@Global()`. Le passage à `SENT` est posé directement par
 * `OwnerStatementDocumentsService` (écriture SQL ciblée après envoi réussi,
 * calquée sur `ReceiptDocumentsService` — voir ce fichier) plutôt que par une
 * méthode ici, pour ne pas faire dépendre le pipeline de ce service.
 */
@Injectable()
export class OwnerStatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionsService,
    @Inject(EXPENSE_READER) private readonly expenseReader: ExpenseReader,
    private readonly auditService: AuditService,
    private readonly documentsPipeline: OwnerStatementDocumentsPipeline,
  ) {}

  async require(tx: TenantClient, id: string): Promise<OwnerStatementRow> {
    const row = (await tx.owner_statements.findFirst({
      where: { id },
    })) as unknown as OwnerStatementRow | null;
    if (!row) throw new DomainError('AGENCY.STATEMENT_NOT_FOUND', { statementId: id });
    return row;
  }

  /** `POST /{id}/issue` (contrat, `OWNER`) : fige le relevé et met le PDF/l'envoi en file. */
  async issue(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertIssuable(before.status as StatementStatus);
      await tx.owner_statements.update({
        where: { id },
        data: { status: 'ISSUED', issued_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.OWNER_STATEMENT_ISSUED,
        entityType: 'owner_statements',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'ISSUED' }),
      });
    });
    // Après COMMIT (même principe que `RECEIPT_ISSUER.scheduleGeneration`) :
    // la génération PDF et l'envoi ne doivent jamais faire échouer la
    // validation elle-même.
    await this.documentsPipeline.enqueue(organizationId, id);
  }

  /** `POST /{id}/cancel` (contrat, `OWNER`, motif obligatoire). */
  async cancel(organizationId: string, userId: string, id: string, reason: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      assertCancellable(before.status as StatementStatus, reason);
      await tx.owner_statements.update({
        where: { id },
        data: { status: 'CANCELLED', cancelled_at: new Date(), updated_at: new Date() },
      });
      await this.commissions.detachFromStatement(tx, id);
      await this.expenseReader.detachFromStatement(tx, id);
      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.OWNER_STATEMENT_CANCELLED,
        entityType: 'owner_statements',
        entityId: id,
        previousState: toJsonState({ status: before.status }),
        newState: toJsonState({ status: 'CANCELLED', reason: reason.trim() }),
      });
    });
  }

  /** Point d'entrée du futur module `owner-payouts` : appelable dans SA propre transaction. */
  async markPaid(tx: TenantClient, statementId: string, paidAt: Date): Promise<void> {
    const before = await this.require(tx, statementId);
    assertPayable(before.status as StatementStatus);
    if (before.status === 'PAID') return;
    await tx.owner_statements.update({
      where: { id: statementId },
      data: { status: 'PAID', settled_at: paidAt, updated_at: new Date() },
    });
    await audit(this.auditService, tx, {
      organizationId: before.organization_id,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.OWNER_STATEMENT_PAID,
      entityType: 'owner_statements',
      entityId: statementId,
      previousState: toJsonState({ status: before.status }),
      newState: toJsonState({ status: 'PAID', paidAt: paidAt.toISOString() }),
    });
  }
}
