import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { publicReference } from '../../leases/application/lease-views';
import { DEPOSIT_STATUSES, type DepositStatus } from '../domain/deposit-rules';
import {
  toDepositSummaryView,
  type DepositSummaryRow,
  type DepositSummaryView,
} from './deposit-views';

export interface DepositsOverview {
  heldTotal: number;
  pendingTotal: number;
  refundDueCount: number;
  byStatus: Record<DepositStatus, number>;
}

/** Colonnes du dépôt, de son bail, de son lot et de son locataire. */
const SUMMARY_SELECT = `
  d.*, l.reference AS lease_reference,
  u.id AS unit_id, u.code AS unit_code,
  t.party_type AS tenant_party_type, t.first_name AS tenant_first_name,
  t.last_name AS tenant_last_name, t.company_name AS tenant_company_name`;

/**
 * Lectures transverses des dépôts : tableau de bord et liste paginée.
 *
 * Séparé de `DepositsService` pour que l'écriture — la partie qui doit rester
 * irréprochable — ne soit pas noyée sous des requêtes d'affichage.
 */
@Injectable()
export class DepositsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Totaux détenus par l'organisation.
   *
   * `pendingTotal` est ce qui reste à ENCAISSER (`required − collected`,
   * jamais négatif), et non le total des dépôts au statut PENDING : un dépôt
   * partiellement versé manque lui aussi à l'appel, et l'agence a besoin de
   * savoir combien elle doit encore réclamer.
   */
  async overview(organizationId: string, userId: string): Promise<DepositsOverview> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<
        Array<{
          held_total: bigint | null;
          pending_total: bigint | null;
          refund_due_count: bigint;
          status: string;
          status_count: bigint;
        }>
      >(
        `SELECT d.status,
                count(*)::bigint AS status_count,
                sum(d.held_amount)::bigint AS held_total,
                sum(greatest(d.required_amount - d.collected_amount, 0))::bigint AS pending_total,
                count(*) FILTER (WHERE d.refund_due_date IS NOT NULL AND d.held_amount > 0)::bigint
                  AS refund_due_count
           FROM deposits d
          WHERE d.organization_id = $1::uuid
          GROUP BY d.status`,
        organizationId,
      ),
    );

    const byStatus = Object.fromEntries(DEPOSIT_STATUSES.map((s) => [s, 0])) as Record<
      DepositStatus,
      number
    >;
    let heldTotal = 0n;
    let pendingTotal = 0n;
    let refundDueCount = 0;

    for (const row of rows) {
      if ((DEPOSIT_STATUSES as readonly string[]).includes(row.status)) {
        byStatus[row.status as DepositStatus] = Number(row.status_count);
      }
      heldTotal += row.held_total ?? 0n;
      pendingTotal += row.pending_total ?? 0n;
      refundDueCount += Number(row.refund_due_count);
    }

    return {
      heldTotal: Number(heldTotal),
      pendingTotal: Number(pendingTotal),
      refundDueCount,
      byStatus,
    };
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { status?: string; refundDueBefore?: string; limit?: number; cursor?: string },
  ): Promise<Page<DepositSummaryView>> {
    const conditions = ['d.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`d.status = $${params.length}::deposit_status`);
    }
    if (filters.refundDueBefore) {
      params.push(filters.refundDueBefore);
      conditions.push(
        `d.refund_due_date IS NOT NULL AND d.refund_due_date <= $${params.length}::date`,
      );
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'd');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<DepositSummaryRow[]>(
        `SELECT ${SUMMARY_SELECT}
           FROM deposits d
           JOIN leases  l ON l.id = d.lease_id
           JOIN units   u ON u.id = l.unit_id
           JOIN tenants t ON t.id = d.tenant_id
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('d')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return {
      items: page.items.map((row) => toDepositSummaryView(row, publicReference)),
      pageInfo: page.pageInfo,
    };
  }
}
