import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { BankChecksService } from '../../bank-checks/application/bank-checks.service';
import { BankTransferDeclarationsService } from '../../bank-transfers/application/bank-transfer-declarations.service';
import { RemittancesService } from '../../cash/application/remittances.service';
import { PaymentsService } from '../../payments/application/payments.service';
import { ReversalService } from '../../payments/application/reversal.service';
import { MATCH_TARGET_COLUMNS, resolveTarget, type MatchTargetType } from '../domain/match-target';
import {
  MATCH_SELECT,
  toReconciliationMatchView,
  type ReconciliationMatchRow,
  type ReconciliationMatchView,
} from './reconciliation-views';

interface LineForSettlement {
  id: string;
  statement_id: string;
  bank_account_id: string;
  amount: bigint;
  matched_amount: bigint;
  is_matched: boolean;
  is_ignored: boolean;
  operation_date: Date;
}

/** Statuts de la cible qui autorisent un rapprochement (contrat § « Cibles possibles »). */
const TARGET_PRE_STATUSES: Readonly<Record<MatchTargetType, readonly string[]>> = {
  PAYMENT: ['PENDING_VERIFICATION'],
  DECLARATION: ['SUBMITTED', 'UNDER_REVIEW', 'MATCHED'],
  CHECK: ['DEPOSITED'],
  REMITTANCE: ['VERIFIED'],
};

const TARGET_TABLE: Readonly<Record<MatchTargetType, string>> = {
  PAYMENT: 'payments',
  DECLARATION: 'bank_transfer_declarations',
  CHECK: 'bank_checks',
  REMITTANCE: 'cash_remittances',
};

/** Colonne de montant de référence de chaque table cible. */
const TARGET_AMOUNT_COLUMN: Readonly<Record<MatchTargetType, string>> = {
  PAYMENT: 'amount',
  DECLARATION: 'declared_amount',
  CHECK: 'amount',
  REMITTANCE: 'counted_amount',
};

export interface CreateConfirmedInput {
  organizationId: string;
  statementLineId: string;
  targetType: MatchTargetType;
  targetId: string;
  matchType: 'EXACT' | 'MANUAL';
  confidenceScore: number;
  matchCriteria: Record<string, unknown>;
  matchedAmount: bigint;
  actorUserId: string | null;
  today: Date;
}

export interface CreateProposedInput {
  organizationId: string;
  statementLineId: string;
  targetType: MatchTargetType;
  targetId: string;
  matchType: 'EXACT' | 'SUGGESTED';
  confidenceScore: number;
  matchCriteria: Record<string, unknown>;
  matchedAmount: bigint;
}

/**
 * Séquences transactionnelles NORMATIVES de la confirmation, du rejet et de
 * l'annulation d'un rapprochement (docs/api/phase6-contract.md, § « Moteur
 * de rapprochement » et § 10 du dossier de cadrage). Un seul point d'entrée
 * pour les effets métier : ni `matches.service.ts` ni le moteur
 * (`reconciliation-engine.service.ts`) n'ouvrent eux-mêmes de mutation sur
 * la cible, la ligne ou le relevé — tout passe par ici.
 */
@Injectable()
export class MatchSettlementService {
  constructor(
    private readonly auditService: AuditService,
    private readonly payments: PaymentsService,
    private readonly reversal: ReversalService,
    private readonly declarations: BankTransferDeclarationsService,
    private readonly bankChecks: BankChecksService,
    private readonly remittances: RemittancesService,
  ) {}

  /**
   * Rapprochement `PROPOSED` (règle EXACT non auto-confirmée, ou suggestion
   * du moteur de score) : aucun effet sur la cible, la ligne ou le relevé —
   * seule l'existence de la ligne du candidat compte ici (§ 10.0 : « un
   * PROPOSED ne modifie rien tant qu'il n'est pas confirmé »).
   */
  async createProposed(tx: TenantClient, input: CreateProposedInput): Promise<{ matchId: string }> {
    const id = newId();
    const column = MATCH_TARGET_COLUMNS[input.targetType];
    await tx.$executeRawUnsafe(
      `INSERT INTO reconciliation_matches
         (id, organization_id, statement_line_id, ${column}, match_type, status,
          matched_amount, confidence_score, match_criteria)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::match_type, 'PROPOSED',
               $6::bigint, $7::smallint, $8::jsonb)`,
      id,
      input.organizationId,
      input.statementLineId,
      input.targetId,
      input.matchType,
      input.matchedAmount,
      input.confidenceScore,
      JSON.stringify(input.matchCriteria),
    );
    await audit(this.auditService, tx, {
      organizationId: input.organizationId,
      action: 'CREATE',
      operation: AUDIT_OPERATIONS.RECONCILIATION_MATCH_PROPOSED,
      entityType: 'reconciliation_matches',
      entityId: id,
      newState: toJsonState({
        statementLineId: input.statementLineId,
        targetType: input.targetType,
        targetId: input.targetId,
        matchType: input.matchType,
        confidenceScore: input.confidenceScore,
      }),
    });
    return { matchId: id };
  }

  /**
   * Naissance directe `CONFIRMED` : rapprochement EXACT auto-confirmé
   * (`autoConfirmExact`) ou rapprochement manuel (`match_type MANUAL`). Un
   * manuel n'a jamais existé en `PROPOSED` : on n'écrit donc PAS l'audit
   * `RECONCILIATION_MATCH_PROPOSED` avant `RECONCILIATION_MATCH_CONFIRMED`
   * dans ce cas — ce serait mentir sur l'historique. Seul l'audit de
   * confirmation est écrit, avec le détail complet en `newState`.
   */
  async createConfirmed(
    tx: TenantClient,
    input: CreateConfirmedInput,
  ): Promise<{ matchId: string; receiptIds: string[]; view: ReconciliationMatchView }> {
    const line = await this.lockLine(tx, input.statementLineId);
    if (line.is_ignored) {
      throw new DomainError('BANK.LINE_IGNORED', { statementLineId: input.statementLineId });
    }
    const target = await this.lockTarget(tx, input.targetType, input.targetId);
    const lineConfirmedSum = await this.confirmedSumForLine(tx, input.statementLineId);
    const targetConfirmedSum = await this.confirmedSumForTarget(
      tx,
      input.targetType,
      input.targetId,
    );
    this.assertNotOverMatched(
      line.amount,
      lineConfirmedSum,
      target.amount,
      targetConfirmedSum,
      input.matchedAmount,
    );

    const id = newId();
    const column = MATCH_TARGET_COLUMNS[input.targetType];
    await tx.$executeRawUnsafe(
      `INSERT INTO reconciliation_matches
         (id, organization_id, statement_line_id, ${column}, match_type, status,
          matched_amount, confidence_score, match_criteria, matched_by_user_id,
          confirmed_at, confirmed_by_user_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::match_type, 'CONFIRMED',
               $6::bigint, $7::smallint, $8::jsonb, $9::uuid, now(), $9::uuid)`,
      id,
      input.organizationId,
      input.statementLineId,
      input.targetId,
      input.matchType,
      input.matchedAmount,
      input.confidenceScore,
      JSON.stringify(input.matchCriteria),
      input.actorUserId,
    );

    const effect = await this.applyEffect(tx, {
      organizationId: input.organizationId,
      targetType: input.targetType,
      targetId: input.targetId,
      statementLineId: input.statementLineId,
      actorUserId: input.actorUserId,
      today: input.today,
      operationDate: line.operation_date,
      bankAccountId: line.bank_account_id,
    });
    await this.recomputeLineAndStatement(tx, line, input.matchedAmount);

    await audit(this.auditService, tx, {
      organizationId: input.organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.RECONCILIATION_MATCH_CONFIRMED,
      entityType: 'reconciliation_matches',
      entityId: id,
      newState: toJsonState({
        statementLineId: input.statementLineId,
        targetType: input.targetType,
        targetId: input.targetId,
        matchType: input.matchType,
        matchedAmount: input.matchedAmount,
        paymentId: effect.paymentId,
      }),
    });

    return { matchId: id, receiptIds: effect.receiptIds, view: await this.loadView(tx, id) };
  }

  /** `POST .../{id}/confirm` : `PROPOSED` → `CONFIRMED`, mêmes effets que `createConfirmed`. */
  async confirmProposed(
    tx: TenantClient,
    params: { organizationId: string; matchId: string; actorUserId: string; today: Date },
  ): Promise<{ receiptIds: string[]; view: ReconciliationMatchView }> {
    const match = await this.lockMatch(tx, params.matchId);
    if (match.status === 'CONFIRMED') {
      throw new DomainError('BANK.MATCH_ALREADY_CONFIRMED', { matchId: params.matchId });
    }
    if (match.status !== 'PROPOSED') {
      throw new DomainError('BANK.MATCH_INVALID_TRANSITION', {
        from: match.status,
        to: 'CONFIRMED',
      });
    }

    const line = await this.lockLine(tx, match.statement_line_id);
    if (line.is_ignored) {
      throw new DomainError('BANK.LINE_IGNORED', { statementLineId: match.statement_line_id });
    }
    const { targetType, targetId } = resolveTarget(match);
    const target = await this.lockTarget(tx, targetType, targetId);
    const lineConfirmedSum = await this.confirmedSumForLine(tx, match.statement_line_id);
    const targetConfirmedSum = await this.confirmedSumForTarget(tx, targetType, targetId);
    this.assertNotOverMatched(
      line.amount,
      lineConfirmedSum,
      target.amount,
      targetConfirmedSum,
      match.matched_amount,
    );

    await tx.$executeRawUnsafe(
      `UPDATE reconciliation_matches
          SET status = 'CONFIRMED', confirmed_at = now(), confirmed_by_user_id = $2::uuid, updated_at = now()
        WHERE id = $1::uuid`,
      params.matchId,
      params.actorUserId,
    );

    const effect = await this.applyEffect(tx, {
      organizationId: params.organizationId,
      targetType,
      targetId,
      statementLineId: match.statement_line_id,
      actorUserId: params.actorUserId,
      today: params.today,
      operationDate: line.operation_date,
      bankAccountId: line.bank_account_id,
    });
    await this.recomputeLineAndStatement(tx, line, match.matched_amount);

    await audit(this.auditService, tx, {
      organizationId: params.organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.RECONCILIATION_MATCH_CONFIRMED,
      entityType: 'reconciliation_matches',
      entityId: params.matchId,
      previousState: toJsonState({ status: 'PROPOSED' }),
      newState: toJsonState({ status: 'CONFIRMED', paymentId: effect.paymentId }),
    });

    return { receiptIds: effect.receiptIds, view: await this.loadView(tx, params.matchId) };
  }

  /** `POST .../{id}/reject` : `PROPOSED` → `REJECTED`, motif obligatoire, aucun autre effet. */
  async reject(
    tx: TenantClient,
    params: { organizationId: string; matchId: string; reason: string },
  ): Promise<ReconciliationMatchView> {
    const match = await this.lockMatch(tx, params.matchId);
    if (match.status !== 'PROPOSED') {
      throw new DomainError('BANK.MATCH_INVALID_TRANSITION', {
        from: match.status,
        to: 'REJECTED',
      });
    }
    await tx.$executeRawUnsafe(
      `UPDATE reconciliation_matches
          SET status = 'REJECTED', rejected_at = now(), rejection_reason = $2, updated_at = now()
        WHERE id = $1::uuid`,
      params.matchId,
      params.reason,
    );
    await audit(this.auditService, tx, {
      organizationId: params.organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.RECONCILIATION_MATCH_REJECTED,
      entityType: 'reconciliation_matches',
      entityId: params.matchId,
      previousState: toJsonState({ status: match.status }),
      newState: toJsonState({ status: 'REJECTED', reason: params.reason }),
    });
    return this.loadView(tx, params.matchId);
  }

  /**
   * `POST .../{id}/reverse` : `CONFIRMED` → `REVERSED`, écriture miroir,
   * libère la ligne, contre-passe le paiement s'il avait été confirmé PAR CE
   * rapprochement (§ 10.0). Motif obligatoire, validé par `matches.service`.
   */
  async reverse(
    tx: TenantClient,
    params: {
      organizationId: string;
      matchId: string;
      reason: string;
      actorUserId: string;
      today: Date;
    },
  ): Promise<{ reversed: ReconciliationMatchView; mirror: ReconciliationMatchView }> {
    void params.today;
    const match = await this.lockMatch(tx, params.matchId);
    if (match.status !== 'CONFIRMED') {
      throw new DomainError('BANK.MATCH_INVALID_TRANSITION', {
        from: match.status,
        to: 'REVERSED',
      });
    }
    const line = await this.lockLine(tx, match.statement_line_id);
    const { targetType, targetId } = resolveTarget(match);
    const column = MATCH_TARGET_COLUMNS[targetType];

    const mirrorId = newId();
    await tx.$executeRawUnsafe(
      `INSERT INTO reconciliation_matches
         (id, organization_id, statement_line_id, ${column}, match_type, status,
          matched_amount, confidence_score, match_criteria, matched_by_user_id, reversal_of_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::match_type, 'REVERSED',
               $6::bigint, $7::smallint, $8::jsonb, $9::uuid, $10::uuid)`,
      mirrorId,
      params.organizationId,
      match.statement_line_id,
      targetId,
      match.match_type,
      match.matched_amount,
      match.confidence_score,
      JSON.stringify(match.match_criteria ?? {}),
      params.actorUserId,
      params.matchId,
    );
    await tx.$executeRawUnsafe(
      `UPDATE reconciliation_matches SET status = 'REVERSED', reversed_at = now(), updated_at = now() WHERE id = $1::uuid`,
      params.matchId,
    );
    await this.recomputeLineAndStatement(tx, line, -match.matched_amount);

    // Contre-passation du paiement SEULEMENT s'il a été confirmé (par ce
    // rapprochement, directement ou via l'approbation d'une déclaration /
    // la compensation d'un chèque) : un paiement encore `PENDING_VERIFICATION`
    // n'a rien à contre-passer, une remise n'a jamais de paiement propre.
    const paymentId = await this.paymentIdOfTarget(tx, targetType, targetId);
    if (paymentId) {
      const rows = await tx.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status::text AS status FROM payments WHERE id = $1::uuid`,
        paymentId,
      );
      if (rows[0]?.status === 'CONFIRMED') {
        await this.reversal.reverseInTx(
          tx,
          params.organizationId,
          { userId: params.actorUserId, role: 'ACCOUNTANT' },
          paymentId,
          params.reason,
        );
      }
    }

    await audit(this.auditService, tx, {
      organizationId: params.organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.RECONCILIATION_MATCH_REVERSED,
      entityType: 'reconciliation_matches',
      entityId: params.matchId,
      previousState: toJsonState({ status: 'CONFIRMED' }),
      newState: toJsonState({ status: 'REVERSED', reason: params.reason, mirrorId }),
    });

    return {
      reversed: await this.loadView(tx, params.matchId),
      mirror: await this.loadView(tx, mirrorId),
    };
  }

  private async lockMatch(tx: TenantClient, id: string): Promise<ReconciliationMatchRow> {
    const rows = await tx.$queryRawUnsafe<ReconciliationMatchRow[]>(
      `SELECT ${MATCH_SELECT} FROM reconciliation_matches m WHERE m.id = $1::uuid FOR UPDATE`,
      id,
    );
    if (!rows[0]) throw new DomainError('BANK.MATCH_NOT_FOUND', { matchId: id });
    return rows[0];
  }

  private async lockLine(tx: TenantClient, id: string): Promise<LineForSettlement> {
    const rows = await tx.$queryRawUnsafe<LineForSettlement[]>(
      `SELECT id, statement_id, bank_account_id, amount, matched_amount, is_matched, is_ignored, operation_date
         FROM bank_statement_lines WHERE id = $1::uuid FOR UPDATE`,
      id,
    );
    if (!rows[0]) throw new DomainError('BANK.STATEMENT_LINE_NOT_FOUND', { statementLineId: id });
    return rows[0];
  }

  /** Verrouille la cible et vérifie qu'elle est dans un état permettant le rapprochement. */
  private async lockTarget(
    tx: TenantClient,
    targetType: MatchTargetType,
    targetId: string,
  ): Promise<{ amount: bigint; status: string }> {
    const table = TARGET_TABLE[targetType];
    const amountColumn = TARGET_AMOUNT_COLUMN[targetType];
    const rows = await tx.$queryRawUnsafe<Array<{ amount: bigint; status: string }>>(
      `SELECT ${amountColumn} AS amount, status::text AS status FROM ${table} WHERE id = $1::uuid FOR UPDATE`,
      targetId,
    );
    const row = rows[0];
    if (!row || !TARGET_PRE_STATUSES[targetType].includes(row.status)) {
      throw new DomainError('BANK.MATCH_TARGET_INVALID', { targetType, targetId });
    }
    return row;
  }

  private async confirmedSumForLine(tx: TenantClient, statementLineId: string): Promise<bigint> {
    const rows = await tx.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT coalesce(sum(matched_amount), 0)::bigint AS total FROM reconciliation_matches
        WHERE statement_line_id = $1::uuid AND status = 'CONFIRMED'`,
      statementLineId,
    );
    return rows[0]?.total ?? 0n;
  }

  private async confirmedSumForTarget(
    tx: TenantClient,
    targetType: MatchTargetType,
    targetId: string,
  ): Promise<bigint> {
    const column = MATCH_TARGET_COLUMNS[targetType];
    const rows = await tx.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT coalesce(sum(matched_amount), 0)::bigint AS total FROM reconciliation_matches
        WHERE ${column} = $1::uuid AND status = 'CONFIRMED'`,
      targetId,
    );
    return rows[0]?.total ?? 0n;
  }

  /** § 10.1 : sur-rapprochement des DEUX côtés, ligne ET cible (409 `BANK.OVER_MATCHED`). */
  private assertNotOverMatched(
    lineAmount: bigint,
    lineConfirmedSum: bigint,
    targetAmount: bigint,
    targetConfirmedSum: bigint,
    matchedAmount: bigint,
  ): void {
    if (lineConfirmedSum + matchedAmount > lineAmount) {
      throw new DomainError('BANK.OVER_MATCHED', { side: 'LINE' });
    }
    if (targetConfirmedSum + matchedAmount > targetAmount) {
      throw new DomainError('BANK.OVER_MATCHED', { side: 'TARGET' });
    }
  }

  /** Dispatch des effets métier par type de cible (§ « Effets d'une confirmation »). */
  private async applyEffect(
    tx: TenantClient,
    params: {
      organizationId: string;
      targetType: MatchTargetType;
      targetId: string;
      statementLineId: string;
      actorUserId: string | null;
      today: Date;
      operationDate: Date;
      bankAccountId: string;
    },
  ): Promise<{ paymentId: string | null; receiptIds: string[] }> {
    // `reader.userId` porte volontairement `null` quand l'acteur est le
    // moteur automatique (règle EXACT) : les services appelés l'écrivent
    // directement dans une colonne SQL nullable, jamais un identifiant
    // fictif qui violerait la clé étrangère vers `users` (même choix que
    // `BankChecksService.settleFromReconciliation`).
    const reader = { userId: params.actorUserId as unknown as string, role: 'ACCOUNTANT' as const };
    switch (params.targetType) {
      case 'PAYMENT': {
        const result = await this.payments.confirmInTx(
          tx,
          params.organizationId,
          reader,
          params.targetId,
          {
            valueDate: params.operationDate,
          },
        );
        return { paymentId: params.targetId, receiptIds: result.receiptIds };
      }
      case 'DECLARATION': {
        const result = await this.declarations.approveInTx(
          tx,
          params.organizationId,
          reader,
          params.targetId,
          {
            statementLineId: params.statementLineId,
          },
        );
        return { paymentId: result.paymentId, receiptIds: result.receiptIds };
      }
      case 'CHECK': {
        const result = await this.bankChecks.settleFromReconciliation(tx, {
          organizationId: params.organizationId,
          bankCheckId: params.targetId,
          actorUserId: params.actorUserId,
          clearingDate: params.operationDate,
          today: params.today,
        });
        return { paymentId: result.paymentId, receiptIds: [...result.receiptIds] };
      }
      case 'REMITTANCE': {
        await this.remittances.depositInTx(tx, params.organizationId, reader, params.targetId, {
          bankAccountId: params.bankAccountId,
          depositedAt: params.operationDate,
        });
        return { paymentId: null, receiptIds: [] };
      }
    }
  }

  /**
   * Ligne : `matched_amount += delta`, `is_matched` recalculé. Relevé :
   * `matched_lines_count` RECALCULÉ (jamais un simple incrément), et passage
   * `RECONCILED` quand plus aucune ligne CRÉDIT n'est ni rapprochée ni
   * ignorée. `delta` négatif lors d'une annulation.
   */
  private async recomputeLineAndStatement(
    tx: TenantClient,
    line: LineForSettlement,
    delta: bigint,
  ): Promise<void> {
    const newMatchedAmount = line.matched_amount + delta;
    const isMatched = newMatchedAmount >= line.amount;
    await tx.$executeRawUnsafe(
      `UPDATE bank_statement_lines
          SET matched_amount = $2::bigint, is_matched = $3::boolean, updated_at = now()
        WHERE id = $1::uuid`,
      line.id,
      newMatchedAmount,
      isMatched,
    );
    const counts = await tx.$queryRawUnsafe<Array<{ matched: number; remaining: number }>>(
      `SELECT
         count(*) FILTER (WHERE is_matched)::int AS matched,
         count(*) FILTER (WHERE direction = 'CREDIT' AND NOT is_ignored AND NOT is_matched)::int AS remaining
       FROM bank_statement_lines WHERE statement_id = $1::uuid`,
      line.statement_id,
    );
    const matchedCount = counts[0]?.matched ?? 0;
    const remaining = counts[0]?.remaining ?? 0;
    await tx.$executeRawUnsafe(
      `UPDATE bank_statements
          SET matched_lines_count = $2::int, updated_at = now(),
              status = CASE WHEN $3::int = 0 THEN 'RECONCILED'::bank_statement_status ELSE status END,
              reconciled_at = CASE WHEN $3::int = 0 THEN now() ELSE reconciled_at END
        WHERE id = $1::uuid`,
      line.statement_id,
      matchedCount,
      remaining,
    );
  }

  /** Paiement lié à une cible, pour la décision de contre-passation à l'annulation. */
  private async paymentIdOfTarget(
    tx: TenantClient,
    targetType: MatchTargetType,
    targetId: string,
  ): Promise<string | null> {
    switch (targetType) {
      case 'PAYMENT':
        return targetId;
      case 'DECLARATION': {
        const rows = await tx.$queryRawUnsafe<Array<{ payment_id: string | null }>>(
          `SELECT payment_id FROM bank_transfer_declarations WHERE id = $1::uuid`,
          targetId,
        );
        return rows[0]?.payment_id ?? null;
      }
      case 'CHECK': {
        const rows = await tx.$queryRawUnsafe<Array<{ payment_id: string | null }>>(
          `SELECT payment_id FROM bank_checks WHERE id = $1::uuid`,
          targetId,
        );
        return rows[0]?.payment_id ?? null;
      }
      case 'REMITTANCE':
        return null;
    }
  }

  private async loadView(tx: TenantClient, id: string): Promise<ReconciliationMatchView> {
    const rows = await tx.$queryRawUnsafe<ReconciliationMatchRow[]>(
      `SELECT ${MATCH_SELECT} FROM reconciliation_matches m WHERE m.id = $1::uuid`,
      id,
    );
    return toReconciliationMatchView(rows[0]);
  }
}
