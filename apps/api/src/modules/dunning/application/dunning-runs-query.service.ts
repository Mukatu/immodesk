import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { toJsonAmount } from '../../../shared/money/amount';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';

export interface DunningRunListFilters {
  ruleId?: string;
  invoiceId?: string;
  tenantId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Conditions `WHERE` (hors keyset) pour la liste des exécutions. Extrait de
 * `list()` pour rester testable sans base : le filtre `tenantId`, ajouté à la
 * demande du mobile (écran « relances de ce locataire »), doit systématiquement
 * s'accompagner du filtre `organizationId` pour emprunter l'index dédié
 * `dunning_runs_tenant_idx ON (organization_id, tenant_id, run_date DESC)`
 * plutôt que de faire parcourir côté client plusieurs pages de l'historique
 * complet de l'organisation.
 */
export function buildDunningRunConditions(
  organizationId: string,
  filters: DunningRunListFilters,
): { conditions: string[]; params: unknown[] } {
  const conditions = ['dr.organization_id = $1::uuid'];
  const params: unknown[] = [organizationId];
  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.ruleId) conditions.push(`dr.rule_id = ${bind(filters.ruleId)}::uuid`);
  if (filters.invoiceId) conditions.push(`dr.invoice_id = ${bind(filters.invoiceId)}::uuid`);
  if (filters.tenantId) conditions.push(`dr.tenant_id = ${bind(filters.tenantId)}::uuid`);
  if (filters.status) conditions.push(`dr.status = ${bind(filters.status)}::dunning_step_status`);
  if (filters.from) conditions.push(`dr.run_date >= ${bind(filters.from)}::date`);
  if (filters.to) conditions.push(`dr.run_date <= ${bind(filters.to)}::date`);
  return { conditions, params };
}

/** Ligne brute jointe (`dunning_runs` + règle, facture, locataire, notification). */
export interface DunningRunRow {
  id: string;
  rule_id: string;
  rule_name: string;
  escalate_to_legal: boolean;
  invoice_id: string | null;
  invoice_number: string | null;
  lease_id: string | null;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  party_type: string;
  step_order: number;
  status: string;
  run_date: Date;
  scheduled_at: Date;
  executed_at: Date | null;
  days_overdue: number;
  balance_amount: bigint;
  channel: string;
  notification_id: string | null;
  message_log_id: string | null;
  message_status: string | null;
  penalty_applied: boolean;
  penalty_amount: bigint;
  skip_reason: string | null;
  error_message: string | null;
  has_active_guarantor: boolean;
  created_at: Date;
}

export interface DunningRunView {
  id: string;
  ruleId: string;
  ruleName: string;
  stepOrder: number;
  status: string;
  runDate: string;
  scheduledAt: string;
  executedAt: string | null;
  daysOverdue: number;
  balanceAmount: number;
  channel: string;
  invoice: { id: string; invoiceNumber: string | null } | null;
  tenant: { id: string; displayName: string };
  notificationId: string | null;
  messageLogId: string | null;
  messageStatus: string | null;
  guarantorNotified: boolean;
  penaltyApplied: boolean;
  penaltyAmount: number;
  skipReason: string | null;
  errorMessage: string | null;
}

export function toDunningRunView(row: DunningRunRow): DunningRunView {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    stepOrder: row.step_order,
    status: row.status,
    runDate: row.run_date.toISOString().slice(0, 10),
    scheduledAt: row.scheduled_at.toISOString(),
    executedAt: row.executed_at ? row.executed_at.toISOString() : null,
    daysOverdue: row.days_overdue,
    balanceAmount: toJsonAmount(row.balance_amount),
    channel: row.channel,
    invoice: row.invoice_id ? { id: row.invoice_id, invoiceNumber: row.invoice_number } : null,
    tenant: {
      id: row.tenant_id,
      displayName: displayNameOf({
        partyType: row.party_type as PartyType,
        firstName: row.first_name,
        lastName: row.last_name,
        companyName: row.company_name,
      }),
    },
    notificationId: row.notification_id,
    messageLogId: row.message_log_id,
    messageStatus: row.message_status,
    // Arbitrage 1 : aucune colonne dédiée. Dérivé de la règle, de l'existence
    // d'un garant actif sur le bail (lease_parties.role = 'GUARANTOR') et du
    // fait que ce palier a effectivement été traité (pas seulement ignoré).
    guarantorNotified:
      row.escalate_to_legal &&
      row.has_active_guarantor &&
      (row.status === 'SENT' || row.status === 'FAILED'),
    penaltyApplied: row.penalty_applied,
    penaltyAmount: toJsonAmount(row.penalty_amount),
    skipReason: row.skip_reason,
    errorMessage: row.error_message,
  };
}

const RUN_SELECT = `dr.*, drl.name AS rule_name, drl.escalate_to_legal, ri.invoice_number,
       t.first_name, t.last_name, t.company_name, t.party_type::text AS party_type,
       ml.status AS message_status,
       EXISTS (SELECT 1 FROM lease_parties lp
                WHERE lp.lease_id = dr.lease_id AND lp.role = 'GUARANTOR'
                  AND lp.guarantor_id IS NOT NULL) AS has_active_guarantor`;
const RUN_FROM = `dunning_runs dr
       JOIN dunning_rules drl ON drl.id = dr.rule_id
       JOIN tenants t ON t.id = dr.tenant_id
       LEFT JOIN rent_invoices ri ON ri.id = dr.invoice_id
       LEFT JOIN message_logs ml ON ml.id = dr.message_log_id`;

/** Lecture de `dunning_runs` (tranche 3) : liste paginée par curseur et détail. */
@Injectable()
export class DunningRunsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    userId: string,
    filters: DunningRunListFilters,
  ): Promise<Page<DunningRunView>> {
    const { conditions, params } = buildDunningRunConditions(organizationId, filters);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'dr');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<DunningRunRow[]>(
        `SELECT ${RUN_SELECT} FROM ${RUN_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('dr')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toDunningRunView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<DunningRunView> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) => this.getIn(tx, id));
    if (!row) throw new DomainError('DUNNING.RUN_NOT_FOUND', { id });
    return toDunningRunView(row);
  }

  async getIn(tx: TenantClient, id: string): Promise<DunningRunRow | null> {
    const rows = await tx.$queryRawUnsafe<DunningRunRow[]>(
      `SELECT ${RUN_SELECT} FROM ${RUN_FROM} WHERE dr.id = $1::uuid`,
      id,
    );
    return rows[0] ?? null;
  }
}
