import { Inject, Injectable, Optional } from '@nestjs/common';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import {
  readOperationalSettings,
  type ReconciliationSettings,
} from '../../../shared/settings/operational-settings';
import type {
  ReconciliationEngine,
  ReconciliationRunResult,
} from '../../bank-statements/domain/ports';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import { exactMatchStatus, isExactMatch } from '../domain/match-rules';
import { extractInvoiceReferences } from '../domain/reference-parser';
import { dayDifference, scoreCandidate, totalScore, type ScoreBreakdown } from '../domain/scoring';
import { CandidateRepository, type Candidate } from './candidate-repository';
import { MatchSettlementService } from './match-settlement.service';

interface CreditLine {
  id: string;
  amount: bigint;
  operation_date: Date;
  label: string;
  normalized_label: string | null;
  end_to_end_reference: string | null;
}

type LineOutcome = 'MATCHED' | 'SUGGESTED' | 'UNMATCHED';

/**
 * Moteur de rapprochement (docs/api/phase6-contract.md, § « Moteur de
 * rapprochement »). Traite les lignes CRÉDIT non ignorées et pas encore
 * `is_matched` d'un relevé : règle EXACT en premier, sinon score de tous les
 * candidats restreints par `CandidateRepository`, une suggestion `PROPOSED`
 * par candidat au-dessus du seuil.
 */
@Injectable()
export class ReconciliationEngineService implements ReconciliationEngine {
  constructor(
    private readonly candidates: CandidateRepository,
    private readonly settlement: MatchSettlementService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  async runForStatement(
    tx: TenantClient,
    input: { organizationId: string; statementId: string; actorUserId: string | null; today: Date },
  ): Promise<ReconciliationRunResult> {
    const orgSettings = await tx.organization_settings.findUnique({
      where: { organization_id: input.organizationId },
      select: { settings_json: true },
    });
    const settings = readOperationalSettings(orgSettings?.settings_json).reconciliation;

    const lines = await tx.$queryRawUnsafe<CreditLine[]>(
      `SELECT id, amount, operation_date, label, normalized_label, end_to_end_reference
         FROM bank_statement_lines
        WHERE statement_id = $1::uuid AND direction = 'CREDIT' AND NOT is_ignored AND NOT is_matched
        ORDER BY line_number`,
      input.statementId,
    );

    let matched = 0;
    let suggested = 0;
    let unmatched = 0;
    const receiptIds: string[] = [];

    for (const line of lines) {
      const result = await this.processLine(tx, {
        organizationId: input.organizationId,
        line,
        settings,
        actorUserId: input.actorUserId,
        today: input.today,
      });
      if (result.outcome === 'MATCHED') {
        matched += 1;
        receiptIds.push(...result.receiptIds);
      } else if (result.outcome === 'SUGGESTED') {
        suggested += 1;
      } else {
        unmatched += 1;
      }
    }

    return { matched, suggested, unmatched, receiptIds };
  }

  /** Après COMMIT seulement : génération des quittances hors transaction. */
  async scheduleAfterCommit(
    organizationId: string,
    result: ReconciliationRunResult,
  ): Promise<void> {
    if (!this.receipts || result.receiptIds.length === 0) return;
    await this.receipts.scheduleGeneration(organizationId, result.receiptIds);
  }

  private async processLine(
    tx: TenantClient,
    params: {
      organizationId: string;
      line: CreditLine;
      settings: ReconciliationSettings;
      actorUserId: string | null;
      today: Date;
    },
  ): Promise<{ outcome: LineOutcome; receiptIds: string[] }> {
    const { organizationId, line, settings } = params;
    const candidates = await this.candidates.findCandidates(tx, {
      organizationId,
      lineAmount: line.amount,
      operationDate: line.operation_date,
      dateWindowDays: settings.dateWindowDays,
      amountTolerancePercent: settings.amountTolerancePercent,
    });

    const references = [
      ...extractInvoiceReferences(line.label),
      ...extractInvoiceReferences(line.end_to_end_reference),
    ];

    const exact = this.findExactCandidate(candidates, references, line, settings.dateWindowDays);
    if (exact) {
      const criteria = this.buildCriteria('EXACT', line, exact, references);
      if (exactMatchStatus(settings.autoConfirmExact) === 'CONFIRMED') {
        const result = await this.settlement.createConfirmed(tx, {
          organizationId,
          statementLineId: line.id,
          targetType: exact.targetType,
          targetId: exact.targetId,
          matchType: 'EXACT',
          confidenceScore: 100,
          matchCriteria: criteria,
          matchedAmount: line.amount,
          actorUserId: params.actorUserId,
          today: params.today,
        });
        return { outcome: 'MATCHED', receiptIds: result.receiptIds };
      }
      await this.settlement.createProposed(tx, {
        organizationId,
        statementLineId: line.id,
        targetType: exact.targetType,
        targetId: exact.targetId,
        matchType: 'EXACT',
        confidenceScore: 100,
        matchCriteria: criteria,
        matchedAmount: line.amount,
      });
      return { outcome: 'SUGGESTED', receiptIds: [] };
    }

    const hasPendingDeclarationSameAmount = candidates.some(
      (c) => c.targetType === 'DECLARATION' && c.amount === line.amount,
    );
    let suggestionsCreated = 0;
    for (const candidate of candidates) {
      const breakdown = scoreCandidate({
        lineAmount: line.amount,
        targetAmount: candidate.amount,
        amountTolerancePercent: settings.amountTolerancePercent,
        lineDate: line.operation_date,
        targetDate: candidate.date,
        normalizedLineLabel: line.normalized_label ?? '',
        normalizedTargetLabel: candidate.normalizedLabel,
        targetType: candidate.targetType,
        hasPendingDeclarationSameAmount,
      });
      if (!breakdown) continue;
      const total = totalScore(breakdown);
      if (total < settings.suggestionThreshold) continue;
      await this.settlement.createProposed(tx, {
        organizationId,
        statementLineId: line.id,
        targetType: candidate.targetType,
        targetId: candidate.targetId,
        matchType: 'SUGGESTED',
        confidenceScore: total,
        matchCriteria: this.buildCriteria('SUGGESTED', line, candidate, references, breakdown),
        matchedAmount: candidate.amount < line.amount ? candidate.amount : line.amount,
      });
      suggestionsCreated += 1;
    }
    return { outcome: suggestionsCreated > 0 ? 'SUGGESTED' : 'UNMATCHED', receiptIds: [] };
  }

  /** Candidat dont la facture référencée figure parmi les références trouvées, montant et date exacts. */
  private findExactCandidate(
    candidates: Candidate[],
    references: string[],
    line: CreditLine,
    dateWindowDays: number,
  ): Candidate | null {
    if (references.length === 0) return null;
    for (const candidate of candidates) {
      const invoiceNumber = candidate.invoice?.invoiceNumber;
      if (!invoiceNumber || !references.includes(invoiceNumber)) continue;
      if (
        isExactMatch({
          hasStructuredReference: true,
          lineAmount: line.amount,
          targetAmount: candidate.amount,
          lineDate: line.operation_date,
          targetDate: candidate.date,
          dateWindowDays,
        })
      ) {
        return candidate;
      }
    }
    return null;
  }

  /** Détail complet enregistré dans `match_criteria` (contrat § calcul du score). */
  private buildCriteria(
    matchKind: 'EXACT' | 'SUGGESTED',
    line: CreditLine,
    candidate: Candidate,
    references: string[],
    breakdown?: ScoreBreakdown,
  ): Record<string, unknown> {
    const amountDifference = Number(
      candidate.amount > line.amount
        ? candidate.amount - line.amount
        : line.amount - candidate.amount,
    );
    return {
      matchKind,
      reference: candidate.invoice?.invoiceNumber
        ? (references.find((r) => r === candidate.invoice?.invoiceNumber) ?? null)
        : null,
      amountDifference,
      dayDifference: dayDifference(line.operation_date, candidate.date),
      lineLabel: line.label,
      normalizedLineLabel: line.normalized_label,
      targetLabel: candidate.label,
      normalizedTargetLabel: candidate.normalizedLabel,
      ...(breakdown ? { scoreBreakdown: breakdown } : {}),
    };
  }
}
