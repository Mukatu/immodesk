import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { readOperationalSettings } from '../../../shared/settings/operational-settings';
import { CurrentTenant, Roles } from '../../../shared/auth/auth.contracts';
import type { TenantContext } from '../../../shared/tenant/tenant-context';
import { toIsoDate } from '../../parties/application/party-views';
import { ORG_HEADER } from '../../parties/presentation/landlords.controller';
import { CandidateRepository, type Candidate } from '../application/candidate-repository';
import { isExactMatch } from '../domain/match-rules';
import type { MatchTargetType } from '../domain/match-target';
import { extractInvoiceReferences } from '../domain/reference-parser';
import { scoreCandidate, totalScore } from '../domain/scoring';

interface SuggestionLineRow {
  id: string;
  amount: bigint;
  operation_date: Date;
  label: string;
  normalized_label: string | null;
  end_to_end_reference: string | null;
}

export interface MatchSuggestion {
  targetType: MatchTargetType;
  targetId: string;
  label: string;
  amount: number;
  date: string;
  confidenceScore: number;
  criteria: Record<string, unknown>;
  tenant: { id: string; displayName: string } | null;
  invoice: { id: string; invoiceNumber: string | null } | null;
}

/**
 * `GET /bank-statement-lines/{id}/suggestions` (docs/api/phase6-contract.md
 * § « Routes ») : calcule les candidats et leurs scores SANS PERSISTER,
 * EXACTEMENT le même calcul que le moteur (`ReconciliationEngineService`),
 * pour qu'un gestionnaire visualise une suggestion avant qu'elle n'existe.
 * `@Controller('bank-statement-lines')` avec UNE SEULE route `:id/suggestions`
 * pour ne jamais entrer en collision avec `BankStatementLinesController`.
 */
@ApiTags('Suggestions de rapprochement')
@ApiBearerAuth()
@Controller('bank-statement-lines')
export class LineSuggestionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidateRepository,
  ) {}

  @Get(':id/suggestions')
  @Roles('ACCOUNTANT')
  @ApiHeader(ORG_HEADER)
  @ApiOperation({ summary: 'Candidats de rapprochement pour une ligne, calcul à la demande' })
  async suggestions(
    @CurrentTenant() tenant: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ items: MatchSuggestion[] }> {
    return this.prisma.withTenant(tenant.organizationId, tenant.userId, (tx) =>
      this.compute(tx, tenant.organizationId, id),
    );
  }

  private async compute(
    tx: TenantClient,
    organizationId: string,
    lineId: string,
  ): Promise<{ items: MatchSuggestion[] }> {
    const rows = await tx.$queryRawUnsafe<SuggestionLineRow[]>(
      `SELECT id, amount, operation_date, label, normalized_label, end_to_end_reference
         FROM bank_statement_lines WHERE id = $1::uuid`,
      lineId,
    );
    const line = rows[0];
    if (!line) throw new DomainError('BANK.STATEMENT_LINE_NOT_FOUND', { statementLineId: lineId });

    const orgSettings = await tx.organization_settings.findUnique({
      where: { organization_id: organizationId },
      select: { settings_json: true },
    });
    const settings = readOperationalSettings(orgSettings?.settings_json).reconciliation;

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
    const hasPendingDeclarationSameAmount = candidates.some(
      (c) => c.targetType === 'DECLARATION' && c.amount === line.amount,
    );

    const items: MatchSuggestion[] = [];
    for (const candidate of candidates) {
      const item = this.scoreOne(
        candidate,
        line,
        references,
        settings,
        hasPendingDeclarationSameAmount,
      );
      if (item) items.push(item);
    }
    items.sort((a, b) => b.confidenceScore - a.confidenceScore);
    return { items };
  }

  private scoreOne(
    candidate: Candidate,
    line: SuggestionLineRow,
    references: string[],
    settings: ReturnType<typeof readOperationalSettings>['reconciliation'],
    hasPendingDeclarationSameAmount: boolean,
  ): MatchSuggestion | null {
    const invoiceNumber = candidate.invoice?.invoiceNumber ?? null;
    const referenceFound =
      invoiceNumber && references.includes(invoiceNumber) ? invoiceNumber : null;
    const exact =
      referenceFound !== null &&
      isExactMatch({
        hasStructuredReference: true,
        lineAmount: line.amount,
        targetAmount: candidate.amount,
        lineDate: line.operation_date,
        targetDate: candidate.date,
        dateWindowDays: settings.dateWindowDays,
      });

    let confidenceScore: number;
    let criteria: Record<string, unknown>;
    if (exact) {
      confidenceScore = 100;
      criteria = { matchKind: 'EXACT', reference: referenceFound };
    } else {
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
      if (!breakdown) return null;
      confidenceScore = totalScore(breakdown);
      if (confidenceScore < settings.suggestionThreshold) return null;
      criteria = { matchKind: 'SUGGESTED', scoreBreakdown: breakdown, reference: referenceFound };
    }

    return {
      targetType: candidate.targetType,
      targetId: candidate.targetId,
      label: candidate.label,
      amount: toJsonAmount(candidate.amount),
      date: toIsoDate(candidate.date) as string,
      confidenceScore,
      criteria,
      tenant: candidate.tenant,
      invoice: candidate.invoice,
    };
  }
}
