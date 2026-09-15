import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import { RECEIPT_ISSUER, type ReceiptIssuer } from '../../payments/domain/ports';
import type { MatchTargetType } from '../domain/match-target';
import { MatchSettlementService } from './match-settlement.service';
import type { ReconciliationMatchView } from './reconciliation-views';

export interface MatchReader {
  userId: string;
  role: MemberRole;
}

export interface CreateManualMatchInput {
  statementLineId: string;
  targetType: MatchTargetType;
  targetId: string;
  matchedAmount: bigint;
  reason?: string | null;
}

/**
 * Façade applicative des rapprochements (docs/api/phase6-contract.md,
 * § « Moteur de rapprochement » et § 10 du dossier de cadrage). Toute la
 * logique transactionnelle (verrous, contrôle de sur-rapprochement, effets
 * sur la cible, mise à jour de la ligne et du relevé) vit dans
 * `MatchSettlementService` : ce service n'ouvre qu'une transaction et
 * traduit les entrées HTTP.
 */
@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlement: MatchSettlementService,
    @Optional() @Inject(RECEIPT_ISSUER) private readonly receipts: ReceiptIssuer | null = null,
  ) {}

  /**
   * `POST /reconciliation-matches` : rapprochement manuel, `match_type
   * MANUAL`, naît directement `CONFIRMED` — un choix humain explicite vaut
   * confiance totale (`confidence_score 100`), donc les mêmes effets qu'une
   * confirmation, appliqués tout de suite. Réutilise
   * `MatchSettlementService.createConfirmed`, qui valide déjà que la ligne
   * existe, n'est pas ignorée, et que ni la ligne ni la cible ne sont
   * sur-rapprochées.
   */
  async create(
    organizationId: string,
    reader: MatchReader,
    input: CreateManualMatchInput,
  ): Promise<ReconciliationMatchView> {
    if (input.matchedAmount <= 0n) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        matchedAmount: 'Montant strictement positif attendu.',
      });
    }
    let receiptIds: string[] = [];
    const view = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const created = await this.settlement.createConfirmed(tx, {
        organizationId,
        statementLineId: input.statementLineId,
        targetType: input.targetType,
        targetId: input.targetId,
        matchType: 'MANUAL',
        confidenceScore: 100,
        matchCriteria: { matchKind: 'MANUAL', reason: input.reason ?? null },
        matchedAmount: input.matchedAmount,
        actorUserId: reader.userId,
        today: businessToday(),
      });
      receiptIds = created.receiptIds;
      return created.view;
    });
    await this.receipts?.scheduleGeneration(organizationId, receiptIds);
    return view;
  }

  /** `POST .../{id}/confirm` : `SUGGESTED`/`PROPOSED` → `CONFIRMED`. */
  async confirm(
    organizationId: string,
    reader: MatchReader,
    id: string,
  ): Promise<ReconciliationMatchView> {
    let receiptIds: string[] = [];
    const view = await this.prisma.withTenant(organizationId, reader.userId, async (tx) => {
      const result = await this.settlement.confirmProposed(tx, {
        organizationId,
        matchId: id,
        actorUserId: reader.userId,
        today: businessToday(),
      });
      receiptIds = result.receiptIds;
      return result.view;
    });
    await this.receipts?.scheduleGeneration(organizationId, receiptIds);
    return view;
  }

  /** `POST .../{id}/reject` : motif obligatoire, `PROPOSED` → `REJECTED`. */
  async reject(
    organizationId: string,
    reader: MatchReader,
    id: string,
    reason: string,
  ): Promise<ReconciliationMatchView> {
    const trimmed = reason?.trim();
    if (!trimmed) throw new DomainError('BANK.MATCH_REASON_REQUIRED');
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.settlement.reject(tx, { organizationId, matchId: id, reason: trimmed }),
    );
  }

  /** `POST .../{id}/reverse` : motif obligatoire, `CONFIRMED` → `REVERSED` + écriture miroir. */
  async reverse(
    organizationId: string,
    reader: MatchReader,
    id: string,
    reason: string,
  ): Promise<{ reversed: ReconciliationMatchView; mirror: ReconciliationMatchView }> {
    const trimmed = reason?.trim();
    if (!trimmed) throw new DomainError('BANK.MATCH_REASON_REQUIRED');
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.settlement.reverse(tx, {
        organizationId,
        matchId: id,
        reason: trimmed,
        actorUserId: reader.userId,
        today: businessToday(),
      }),
    );
  }
}
