import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import {
  momoInitiatorUserId,
  MOMO_SUMMARY_FROM,
  MOMO_SUMMARY_SELECT,
  toMomoTransactionView,
  type MomoTransactionSummaryRow,
  type MomoTransactionView,
} from './momo-views';

export interface MomoReader {
  userId: string;
  role: MemberRole;
}

export interface MomoListFilters {
  channel?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class MomoQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    reader: MomoReader,
    filters: MomoListFilters,
    forcedChannel?: string,
  ): Promise<Page<MomoTransactionView>> {
    const conditions = ['m.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    const channel = forcedChannel ?? filters.channel;
    if (channel) conditions.push(`m.channel = ${bind(channel)}::momo_channel`);
    if (filters.status) conditions.push(`m.status = ${bind(filters.status)}::momo_status`);
    if (filters.from) conditions.push(`m.initiated_at >= ${bind(filters.from)}::timestamptz`);
    if (filters.to) conditions.push(`m.initiated_at <= ${bind(filters.to)}::timestamptz`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'm');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.$queryRawUnsafe<MomoTransactionSummaryRow[]>(
        `SELECT ${MOMO_SUMMARY_SELECT} FROM ${MOMO_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('m')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toMomoTransactionView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, reader: MomoReader, id: string): Promise<MomoTransactionView> {
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.getIn(tx, id, reader),
    );
  }

  async getIn(tx: TenantClient, id: string, reader?: MomoReader): Promise<MomoTransactionView> {
    const rows = await tx.$queryRawUnsafe<MomoTransactionSummaryRow[]>(
      `SELECT ${MOMO_SUMMARY_SELECT} FROM ${MOMO_SUMMARY_FROM} WHERE m.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row || (reader?.role === 'COLLECTOR' && momoInitiatorUserId(row) !== reader.userId)) {
      throw new DomainError('MOMO.NOT_FOUND', { momoTransactionId: id });
    }
    return toMomoTransactionView(row);
  }

  /** Verrou de ligne pour une transition (approve/reject/cancel/verify-status). */
  async lock(tx: TenantClient, id: string): Promise<MomoTransactionSummaryRow> {
    const rows = await tx.$queryRawUnsafe<MomoTransactionSummaryRow[]>(
      `SELECT ${MOMO_SUMMARY_SELECT} FROM ${MOMO_SUMMARY_FROM} WHERE m.id = $1::uuid FOR UPDATE OF m`,
      id,
    );
    if (!rows[0]) throw new DomainError('MOMO.NOT_FOUND', { momoTransactionId: id });
    return rows[0];
  }

  async findByClientRef(
    tx: TenantClient,
    clientRef: string,
  ): Promise<MomoTransactionSummaryRow | null> {
    const rows = await tx.$queryRawUnsafe<MomoTransactionSummaryRow[]>(
      `SELECT ${MOMO_SUMMARY_SELECT} FROM ${MOMO_SUMMARY_FROM} WHERE m.client_ref = $1`,
      clientRef,
    );
    return rows[0] ?? null;
  }

  async findByMerchantReference(
    tx: TenantClient,
    merchantReference: string,
  ): Promise<MomoTransactionSummaryRow | null> {
    const rows = await tx.$queryRawUnsafe<MomoTransactionSummaryRow[]>(
      `SELECT ${MOMO_SUMMARY_SELECT} FROM ${MOMO_SUMMARY_FROM} WHERE m.merchant_reference = $1`,
      merchantReference,
    );
    return rows[0] ?? null;
  }
}
