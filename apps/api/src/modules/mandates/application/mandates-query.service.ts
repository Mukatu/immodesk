import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { PROPERTY_READER, type PropertyReader } from '../../parties/domain/read-ports';
import { toLandlordSummary } from '../../parties/application/party-views';
import type { PropertySummaryView } from '../../portfolio/application/portfolio-views';
import {
  toMandateSummaryView,
  toMandateView,
  toStatementSummaryView,
  type MandateDetailView,
  type MandateRow,
  type MandateSummaryRow,
  type MandateSummaryView,
  type StatementSummaryForMandateRow,
} from './mandate-views';

const SUMMARY_SELECT = `
  m.*,
  l.party_type    AS landlord_party_type,
  l.first_name    AS landlord_first_name,
  l.last_name     AS landlord_last_name,
  l.company_name  AS landlord_company_name,
  l.country_code  AS landlord_country_code,
  CASE WHEN m.property_id IS NOT NULL THEN 1
       ELSE (SELECT count(*) FROM properties p
              WHERE p.landlord_id = m.landlord_id AND p.deleted_at IS NULL)
  END AS properties_count`;

/**
 * Lectures transverses des mandats : liste paginée et fiche détaillée.
 * Séparé de `MandatesService` (écriture) comme `DepositsQueryService`.
 */
@Injectable()
export class MandatesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Optional() @Inject(PROPERTY_READER) private readonly propertyReader?: PropertyReader,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: {
      status?: string;
      landlordId?: string;
      propertyId?: string;
      limit?: number;
      cursor?: string;
    },
  ): Promise<Page<MandateSummaryView>> {
    const conditions = ['m.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`m.status = $${params.length}::mandate_status`);
    }
    if (filters.landlordId) {
      params.push(filters.landlordId);
      conditions.push(`m.landlord_id = $${params.length}::uuid`);
    }
    if (filters.propertyId) {
      params.push(filters.propertyId);
      conditions.push(`m.property_id = $${params.length}::uuid`);
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'm');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<MandateSummaryRow[]>(
        `SELECT ${SUMMARY_SELECT}
           FROM management_mandates m
           JOIN landlords l ON l.id = m.landlord_id
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('m')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toMandateSummaryView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<MandateDetailView> {
    return this.prisma.withTenant(organizationId, userId, (tx) => this.detailIn(tx, id));
  }

  /** Composition de la fiche détaillée, réutilisable dans la transaction d'une écriture. */
  async detailIn(tx: TenantClient, id: string): Promise<MandateDetailView> {
    const row = (await tx.management_mandates.findFirst({
      where: { id },
    })) as unknown as MandateRow | null;
    if (!row) throw new DomainError('AGENCY.MANDATE_NOT_FOUND', { mandateId: id });

    const landlordRow = await tx.landlords.findFirst({ where: { id: row.landlord_id } });
    if (!landlordRow)
      throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: row.landlord_id });

    const portfolio = ((await this.propertyReader?.listSummariesForLandlord(tx, row.landlord_id)) ??
      []) as PropertySummaryView[];
    const properties = row.property_id
      ? portfolio.filter((p) => p.id === row.property_id)
      : portfolio;

    const landlord = toLandlordSummary(landlordRow);
    const statements = await this.statementsFor(tx, id, landlord);
    const landlordPortal = await this.landlordPortalStatus(tx, id, landlordRow.user_id);

    return { ...toMandateView(row), landlord, properties, statements, landlordPortal };
  }

  /** Relevés déjà émis pour ce mandat (lecture seule ; `owner-statements` en reste propriétaire). */
  private async statementsFor(
    tx: TenantClient,
    mandateId: string,
    landlord: { id: string; displayName: string },
  ) {
    const rows = await tx.$queryRawUnsafe<StatementSummaryForMandateRow[]>(
      `SELECT s.id, s.statement_number, s.status, s.property_id, p.name AS property_name,
              s.period_start, s.period_end, s.rent_collected_amount, s.commission_amount,
              s.expenses_amount, s.carry_forward_amount, s.net_payable_amount,
              s.issued_at, s.sent_at, s.settled_at
         FROM owner_statements s
         LEFT JOIN properties p ON p.id = s.property_id
        WHERE s.mandate_id = $1::uuid
        ORDER BY s.period_start DESC`,
      mandateId,
    );
    return rows.map((row) => toStatementSummaryView(row, landlord));
  }

  /**
   * `landlordPortal` (contrat, § Types) : `activated`/`userId` dérivés de
   * `landlords.user_id` (déjà chargé par l'appelant). `invited`/`invitedAt`
   * dérivés de la dernière ligne `message_logs` du modèle
   * `LANDLORD_PORTAL_INVITE` tracée pour ce mandat — aucune colonne
   * dédiée : c'est la trace d'envoi qui fait foi.
   */
  private async landlordPortalStatus(
    tx: TenantClient,
    mandateId: string,
    landlordUserId: string | null,
  ) {
    const lastInvite = await tx.message_logs.findFirst({
      where: {
        related_entity_type: 'management_mandate',
        related_entity_id: mandateId,
        template_code: 'LANDLORD_PORTAL_INVITE',
      },
      orderBy: { queued_at: 'desc' },
      select: { queued_at: true },
    });
    return {
      invited: Boolean(lastInvite),
      invitedAt: lastInvite ? lastInvite.queued_at.toISOString() : null,
      activated: landlordUserId !== null,
      userId: landlordUserId,
    };
  }
}
