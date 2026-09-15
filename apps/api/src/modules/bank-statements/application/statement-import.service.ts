import { createHash } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { DocumentsService } from '../../documents/application/documents.service';
import { checkBalance } from '../domain/balance-check';
import type { CanonicalStatement, ImplementedFormat } from '../domain/canonical-statement';
import { normalizeLabel } from '../domain/label-normalization';
import {
  RECONCILIATION_ENGINE,
  type ReconciliationEngine,
  type ReconciliationRunResult,
} from '../domain/ports';
import { detectAdapter } from '../infrastructure/adapters/adapter-registry';
import { StatementsQueryService } from './statements-query.service';
import type { ImportReport, StatementDetailView } from './statement-views';

export interface ImportStatementInput {
  documentId: string;
  format?: ImplementedFormat;
}

export interface StatementActor {
  userId: string;
  role: MemberRole;
}

const EMPTY_RESULT: ReconciliationRunResult = {
  matched: 0,
  suggested: 0,
  unmatched: 0,
  receiptIds: [],
};

@Injectable()
export class StatementImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly documentsService: DocumentsService,
    private readonly auditService: AuditService,
    private readonly queries: StatementsQueryService,
    @Optional()
    @Inject(RECONCILIATION_ENGINE)
    private readonly engine: ReconciliationEngine | null = null,
  ) {}

  /**
   * Import d'un relevé, TOUS les contrôles avant toute écriture
   * (docs/api/phase6-contract.md § « Import de relevés », ordre normatif) :
   * un import refusé ne laisse ni ligne ni `bank_statements` en base.
   */
  async import(
    organizationId: string,
    actor: StatementActor,
    bankAccountId: string,
    input: ImportStatementInput,
  ): Promise<ImportReport> {
    // Lecture seule : compte bancaire, cohérence du document, contenu réel.
    const { buffer, sizeBytes } = await this.prisma.withTenant(
      organizationId,
      actor.userId,
      async (tx) => {
        await this.requireBankAccount(tx, bankAccountId);
        await this.assertDocumentMatchesAccount(tx, input.documentId, bankAccountId);
        return this.documentsService.readContent(tx, input.documentId);
      },
    );

    // 1. Taille.
    const maxBytes = this.config.get('BANK_STATEMENT_MAX_BYTES');
    if (sizeBytes > maxBytes) {
      throw new DomainError('BANK.STATEMENT_FILE_TOO_LARGE', { sizeBytes, maxBytes });
    }

    // 2. Détection de format.
    const adapter = detectAdapter(buffer, input.format);
    if (!adapter) throw new DomainError('BANK.STATEMENT_FORMAT_UNKNOWN', { format: input.format });

    // 3. Analyse.
    let statement: CanonicalStatement;
    try {
      statement = adapter.parse(buffer);
    } catch (error) {
      throw new DomainError('BANK.STATEMENT_PARSE_FAILED', {
        adapter: adapter.code,
        reason: error instanceof Error ? error.message : String(error),
      });
    }

    // 4. Vide.
    if (statement.lines.length === 0) throw new DomainError('BANK.STATEMENT_EMPTY');

    // 5. Devise (la forme canonique type déjà `'XAF'` ; contrôle défensif).
    if (statement.currency !== 'XAF') {
      throw new DomainError('BANK.STATEMENT_CURRENCY_UNSUPPORTED', {
        currency: statement.currency,
      });
    }

    // 6. Période stricte (`bank_statements_period_chk`).
    if (new Date(statement.periodStart) >= new Date(statement.periodEnd)) {
      throw new DomainError('BANK.STATEMENT_PERIOD_INVALID', {
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
      });
    }

    // 7. Équilibre.
    const balance = checkBalance(statement);
    if (!balance.balanced) {
      throw new DomainError('BANK.STATEMENT_BALANCE_MISMATCH', {
        expected: balance.expected,
        actual: balance.actual,
        difference: balance.difference,
      });
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const statementId = newId();

    let engineResult: ReconciliationRunResult = EMPTY_RESULT;
    try {
      await this.prisma.withTenant(organizationId, actor.userId, async (tx) => {
        await this.requireBankAccount(tx, bankAccountId);
        const totalCredit = statement.lines
          .filter((l) => l.direction === 'CREDIT')
          .reduce((sum, l) => sum + l.amount, 0);
        const totalDebit = statement.lines
          .filter((l) => l.direction === 'DEBIT')
          .reduce((sum, l) => sum + l.amount, 0);

        await tx.bank_statements.create({
          data: {
            id: statementId,
            organization_id: organizationId,
            bank_account_id: bankAccountId,
            format: adapter.format,
            status: 'PARSED',
            statement_reference: statement.statementReference ?? null,
            period_start: new Date(statement.periodStart),
            period_end: new Date(statement.periodEnd),
            opening_balance: BigInt(statement.openingBalance),
            closing_balance: BigInt(statement.closingBalance),
            currency: 'XAF',
            lines_count: statement.lines.length,
            matched_lines_count: 0,
            total_credit_amount: BigInt(totalCredit),
            total_debit_amount: BigInt(totalDebit),
            document_id: input.documentId,
            file_checksum_sha256: checksum,
            imported_by_user_id: actor.userId,
            imported_at: new Date(),
            parsed_at: new Date(),
          },
        });

        await tx.bank_statement_lines.createMany({
          data: statement.lines.map((line) => ({
            id: newId(),
            organization_id: organizationId,
            statement_id: statementId,
            bank_account_id: bankAccountId,
            line_number: line.lineNumber,
            direction: line.direction,
            operation_date: new Date(line.operationDate),
            value_date: line.valueDate ? new Date(line.valueDate) : null,
            amount: BigInt(line.amount),
            currency: 'XAF',
            running_balance: line.runningBalance !== undefined ? BigInt(line.runningBalance) : null,
            label: line.label,
            counterparty_name: line.counterpartyName ?? null,
            counterparty_account: line.counterpartyAccount ?? null,
            bank_reference: line.bankReference ?? null,
            end_to_end_reference: line.endToEndReference ?? null,
            operation_code: line.operationCode ?? null,
            is_matched: false,
            matched_amount: 0n,
            is_ignored: false,
            normalized_label: normalizeLabel(line.label),
            raw_payload: line.raw as object,
          })),
        });

        if (this.engine) {
          engineResult = await this.engine.runForStatement(tx, {
            organizationId,
            statementId,
            actorUserId: actor.userId,
            today: new Date(),
          });
        }

        await audit(this.auditService, tx, {
          organizationId,
          action: 'IMPORT',
          operation: AUDIT_OPERATIONS.BANK_STATEMENT_IMPORTED,
          entityType: 'bank_statements',
          entityId: statementId,
          newState: toJsonState({
            bankAccountId,
            format: adapter.format,
            linesCount: statement.lines.length,
            checksum,
          }),
        });
      });
    } catch (error) {
      // Pas de `hint` : la transaction n'écrit QUE `bank_statements` (nouvel
      // id) et `bank_statement_lines` (nouveau `statement_id`) — la seule
      // violation d'unicité possible ici est `bank_statements_checksum_uk`.
      // Selon la version de Postgres/Prisma, `meta.target` peut ne pas lister
      // les colonnes d'une contrainte nommée (« Unique constraint failed on
      // the (not available) ») : imposer un `hint` ferait alors passer un
      // vrai doublon pour une erreur 500 non traduite.
      if (isUniqueViolation(error)) {
        const existing = await this.findByChecksum(
          organizationId,
          actor.userId,
          bankAccountId,
          checksum,
        );
        if (existing) {
          throw new DomainError('BANK.STATEMENT_ALREADY_IMPORTED', { statementId: existing.id });
        }
      }
      throw error;
    }

    if (this.engine) await this.engine.scheduleAfterCommit(organizationId, engineResult);

    return {
      statementId,
      linesAccepted: statement.lines.length,
      linesIgnored: 0,
      linesInError: [],
      autoMatched: engineResult.matched,
      suggested: engineResult.suggested,
    };
  }

  /**
   * Abandon d'un import erroné (`POST /bank-statements/{id}/discard`) :
   * toutes les lignes non déjà ignorées passent `is_ignored = true`. Le
   * statut du relevé NE CHANGE PAS (aucun statut d'abandon dans l'énumération).
   */
  async discard(
    organizationId: string,
    actor: StatementActor,
    id: string,
    reason: string | null,
  ): Promise<StatementDetailView> {
    return this.prisma.withTenant(organizationId, actor.userId, async (tx) => {
      const row = await this.queries.lockRow(tx, id);

      const confirmed = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT m.id FROM reconciliation_matches m
           JOIN bank_statement_lines l ON l.id = m.statement_line_id
          WHERE l.statement_id = $1::uuid AND m.status = 'CONFIRMED'
          LIMIT 1`,
        id,
      );
      if (confirmed[0]) throw new DomainError('BANK.STATEMENT_HAS_MATCHES', { statementId: id });

      if (row.is_discarded) {
        throw new DomainError('BANK.STATEMENT_ALREADY_DISCARDED', { statementId: id });
      }

      const motif = reason ?? 'Import abandonné.';
      await tx.$executeRawUnsafe(
        `UPDATE bank_statement_lines
            SET is_ignored = true, ignore_reason = $2, updated_at = now()
          WHERE statement_id = $1::uuid AND NOT is_ignored`,
        id,
        motif,
      );

      await audit(this.auditService, tx, {
        organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.BANK_STATEMENT_DISCARDED,
        entityType: 'bank_statements',
        entityId: id,
        previousState: toJsonState({ isDiscarded: false }),
        newState: toJsonState({ isDiscarded: true, reason: motif }),
      });

      return this.queries.getIn(tx, id);
    });
  }

  /**
   * `POST /bank-statements/{id}/reconcile` : rejoue le moteur sur les lignes
   * non traitées. Sans port `RECONCILIATION_ENGINE` (lot 3 pas encore livré),
   * `unmatched` compte les lignes CREDIT ni ignorées ni rapprochées.
   */
  async reconcile(
    organizationId: string,
    actor: StatementActor,
    id: string,
  ): Promise<ReconciliationRunResult> {
    const result = await this.prisma.withTenant(organizationId, actor.userId, async (tx) => {
      await this.queries.findRow(tx, id);
      if (this.engine) {
        return this.engine.runForStatement(tx, {
          organizationId,
          statementId: id,
          actorUserId: actor.userId,
          today: new Date(),
        });
      }
      const rows = await tx.$queryRawUnsafe<Array<{ count: number }>>(
        `SELECT count(*)::int AS count FROM bank_statement_lines
          WHERE statement_id = $1::uuid AND direction = 'CREDIT'
            AND NOT is_ignored AND NOT is_matched`,
        id,
      );
      return { ...EMPTY_RESULT, unmatched: rows[0]?.count ?? 0 };
    });
    if (this.engine) await this.engine.scheduleAfterCommit(organizationId, result);
    return result;
  }

  private async requireBankAccount(tx: TenantClient, bankAccountId: string): Promise<void> {
    const found = await tx.bank_accounts.findFirst({
      where: { id: bankAccountId },
      select: { id: true },
    });
    if (!found) throw new DomainError('BANKING.ACCOUNT_NOT_FOUND', { bankAccountId });
  }

  /**
   * Vérifie que le document, s'il annonce `related_entity_type: 'bank_statement'`
   * avec un `related_entity_id` renseigné, cible bien CE compte (convention :
   * le client tague le document uploadé avec l'identifiant du compte visé,
   * l'identifiant du relevé n'existant pas encore au moment du téléversement).
   * Un document sans ce marquage n'est pas bloqué : la vérification reste
   * défensive, pas une exigence du flux d'upload générique.
   */
  private async assertDocumentMatchesAccount(
    tx: TenantClient,
    documentId: string,
    bankAccountId: string,
  ): Promise<void> {
    const doc = await tx.documents.findFirst({
      where: { id: documentId, deleted_at: null },
      select: { related_entity_type: true, related_entity_id: true },
    });
    if (!doc) throw new DomainError('DOCUMENTS.NOT_FOUND', { documentId });
    if (
      doc.related_entity_type === 'bank_statement' &&
      doc.related_entity_id &&
      doc.related_entity_id !== bankAccountId
    ) {
      throw new DomainError('BANK.STATEMENT_ACCOUNT_MISMATCH', { documentId, bankAccountId });
    }
  }

  private async findByChecksum(
    organizationId: string,
    userId: string,
    bankAccountId: string,
    checksum: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.bank_statements.findFirst({
        where: {
          organization_id: organizationId,
          bank_account_id: bankAccountId,
          file_checksum_sha256: checksum,
        },
        select: { id: true },
      }),
    );
  }
}
