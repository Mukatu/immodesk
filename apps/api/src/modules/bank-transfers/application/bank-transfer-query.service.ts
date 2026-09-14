import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import {
  toTransferDeclarationView,
  TRANSFER_SUMMARY_FROM,
  TRANSFER_SUMMARY_SELECT,
  type TransferDeclarationSummaryRow,
  type TransferDeclarationView,
} from './bank-transfer-views';

export interface TransferReader {
  userId: string;
  role: MemberRole;
}

export interface TransferListFilters {
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class BankTransferQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async list(
    organizationId: string,
    reader: TransferReader,
    filters: TransferListFilters,
  ): Promise<Page<TransferDeclarationView>> {
    const conditions = ['b.organization_id = $1::uuid'];
    const params: unknown[] = [organizationId];
    const bind = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };
    if (filters.status) conditions.push(`b.status = ${bind(filters.status)}::declaration_status`);
    if (filters.from)
      conditions.push(`b.transfer_date >= ${bind(filters.from.slice(0, 10))}::date`);
    if (filters.to) conditions.push(`b.transfer_date <= ${bind(filters.to.slice(0, 10))}::date`);

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'b');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }
    const rows = await this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      tx.$queryRawUnsafe<TransferDeclarationSummaryRow[]>(
        `SELECT ${TRANSFER_SUMMARY_SELECT} FROM ${TRANSFER_SUMMARY_FROM}
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('b')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );
    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map((r) => toTransferDeclarationView(r)), pageInfo: page.pageInfo };
  }

  async get(
    organizationId: string,
    reader: TransferReader,
    id: string,
  ): Promise<TransferDeclarationView> {
    return this.prisma.withTenant(organizationId, reader.userId, (tx) =>
      this.getIn(tx, id, reader),
    );
  }

  async getIn(
    tx: TenantClient,
    id: string,
    reader?: TransferReader,
  ): Promise<TransferDeclarationView> {
    const rows = await tx.$queryRawUnsafe<TransferDeclarationSummaryRow[]>(
      `SELECT ${TRANSFER_SUMMARY_SELECT} FROM ${TRANSFER_SUMMARY_FROM} WHERE b.id = $1::uuid`,
      id,
    );
    const row = rows[0];
    if (!row || (reader?.role === 'COLLECTOR' && row.submitted_by_user_id !== reader.userId)) {
      throw new DomainError('BANK.NOT_FOUND', { bankTransferDeclarationId: id });
    }
    return toTransferDeclarationView(row);
  }

  async lock(tx: TenantClient, id: string): Promise<TransferDeclarationSummaryRow> {
    const rows = await tx.$queryRawUnsafe<TransferDeclarationSummaryRow[]>(
      `SELECT ${TRANSFER_SUMMARY_SELECT} FROM ${TRANSFER_SUMMARY_FROM} WHERE b.id = $1::uuid FOR UPDATE OF b`,
      id,
    );
    if (!rows[0]) throw new DomainError('BANK.NOT_FOUND', { bankTransferDeclarationId: id });
    return rows[0];
  }

  async findByClientRef(
    tx: TenantClient,
    clientRef: string,
  ): Promise<TransferDeclarationSummaryRow | null> {
    const rows = await tx.$queryRawUnsafe<TransferDeclarationSummaryRow[]>(
      `SELECT ${TRANSFER_SUMMARY_SELECT} FROM ${TRANSFER_SUMMARY_FROM} WHERE b.client_ref = $1`,
      clientRef,
    );
    return rows[0] ?? null;
  }
}
