import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { monthBounds } from '../../../shared/time/business-date';
import {
  toStatementDetailView,
  toStatementSummaryView,
  type OwnerPayoutForStatementRow,
  type OwnerStatementJoinedRow,
  type OwnerStatementLineRow,
  type StatementDetailView,
  type StatementSummaryView,
} from './owner-statement-views';

const JOINED_SELECT = `
  s.*,
  l.party_type   AS landlord_party_type,
  l.first_name   AS landlord_first_name,
  l.last_name    AS landlord_last_name,
  l.company_name AS landlord_company_name,
  p.name         AS property_name`;

export interface StatementListFilters {
  landlordId?: string;
  mandateId?: string;
  /** `YYYY-MM` : filtre sur le mois de `period_start` (contrat, `period=`). */
  period?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Lectures transverses des relevés : liste paginée et fiche détaillée
 * (contrat, routes `GET /v1/owner-statements` et `GET /{id}`). Séparé de
 * `OwnerStatementsService` (transitions d'état) comme `MandatesQueryService`.
 */
@Injectable()
export class OwnerStatementsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: StatementListFilters,
  ): Promise<Page<StatementSummaryView>> {
    const conditions = ['s.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];

    if (filters.landlordId) {
      params.push(filters.landlordId);
      conditions.push(`s.landlord_id = $${params.length}::uuid`);
    }
    if (filters.mandateId) {
      params.push(filters.mandateId);
      conditions.push(`s.mandate_id = $${params.length}::uuid`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`s.status = $${params.length}::statement_status`);
    }
    if (filters.period) {
      const bounds = monthBounds(filters.period);
      if (!bounds) {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD', { period: 'Format AAAA-MM attendu.' });
      }
      params.push(bounds.start);
      conditions.push(`s.period_start = $${params.length}::date`);
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 's');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<OwnerStatementJoinedRow[]>(
        `SELECT ${JOINED_SELECT}
           FROM owner_statements s
           JOIN landlords l ON l.id = s.landlord_id
           LEFT JOIN properties p ON p.id = s.property_id
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('s')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toStatementSummaryView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<StatementDetailView> {
    return this.prisma.withTenant(organizationId, userId, (tx) => this.detailIn(tx, id));
  }

  /** Composition de la fiche détaillée, réutilisable dans la transaction d'une écriture. */
  async detailIn(tx: TenantClient, id: string): Promise<StatementDetailView> {
    const rows = await tx.$queryRawUnsafe<OwnerStatementJoinedRow[]>(
      `SELECT ${JOINED_SELECT}
         FROM owner_statements s
         JOIN landlords l ON l.id = s.landlord_id
         LEFT JOIN properties p ON p.id = s.property_id
        WHERE s.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row) throw new DomainError('AGENCY.STATEMENT_NOT_FOUND', { statementId: id });

    const lines = (await tx.owner_statement_lines.findMany({
      where: { statement_id: id },
      orderBy: { position: 'asc' },
    })) as unknown as OwnerStatementLineRow[];

    const payout = await this.payoutFor(tx, id);
    return toStatementDetailView(row, lines, payout);
  }

  /**
   * `StatementDetail.payout` (contrat, § Types) : lecture directe de
   * `owner_payouts` par `statement_id` — `owner-payouts` en reste
   * propriétaire, cette lecture est une pure composition d'affichage (même
   * logique que `mandates-query.service.ts` lisant `owner_statements`). Un
   * relevé ne porte jamais qu'un reversement non annulé (contrat,
   * `AGENCY.PAYOUT_ALREADY_EXISTS`) ; un éventuel reversement `CANCELLED`
   * plus ancien est ignoré tant qu'un reversement plus récent existe.
   */
  private async payoutFor(
    tx: TenantClient,
    statementId: string,
  ): Promise<OwnerPayoutForStatementRow | null> {
    const rows = await tx.$queryRawUnsafe<OwnerPayoutForStatementRow[]>(
      `SELECT id, reference, status, method, amount, net_amount, paid_at
         FROM owner_payouts
        WHERE statement_id = $1::uuid
        ORDER BY (status = 'CANCELLED'), created_at DESC
        LIMIT 1`,
      statementId,
    );
    return rows[0] ?? null;
  }
}
