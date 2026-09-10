import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { sqlSearchClause, toLikePattern } from '../../../shared/search/search-text';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  assertPartyName,
  normalizeOptionalPhone,
  normalizePartyPhone,
  trimOrNull,
  type PartyType,
} from '../domain/party-rules';
import { toLandlordView, type LandlordRow, type LandlordView } from './party-views';

export interface LandlordInput {
  partyType?: PartyType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  gender?: string;
  birthDate?: string | null;
  nationality?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  idDocumentExpiry?: string | null;
  idDocumentId?: string | null;
  rccmNumber?: string | null;
  niuNumber?: string | null;
  primaryPhone?: string;
  secondaryPhone?: string | null;
  email?: string | null;
  addressLine?: string | null;
  district?: string | null;
  city?: string;
  countryCode?: string;
  defaultBankAccountId?: string | null;
  payoutMethod?: string;
  notes?: string | null;
}

/** Colonnes fouillées par `?q=` : identité, raison sociale, téléphones. */
const LANDLORD_SEARCH_COLUMNS = [
  'first_name',
  'last_name',
  'company_name',
  'primary_phone',
  'secondary_phone',
];

@Injectable()
export class LandlordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: LandlordInput,
  ): Promise<LandlordView> {
    const partyType = input.partyType ?? 'INDIVIDUAL';
    assertPartyName({ ...input, partyType });
    const id = newId();

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const created = (await tx.landlords.create({
        data: {
          id,
          organization_id: organizationId,
          party_type: partyType,
          is_self: false,
          ...this.toColumns(input, partyType),
          primary_phone: normalizePartyPhone(input.primaryPhone ?? ''),
        },
      })) as unknown as LandlordRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.LANDLORD_CREATED,
        entityType: 'landlords',
        entityId: id,
        newState: toJsonState(toLandlordView(created)),
      });
      return toLandlordView(created);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { q?: string; city?: string; limit?: number; cursor?: string },
  ): Promise<Page<LandlordView>> {
    const conditions = ['l.organization_id = $1::uuid', 'l.deleted_at IS NULL'];
    const params: unknown[] = [organizationId];

    if (filters.q?.trim()) {
      params.push(toLikePattern(filters.q));
      conditions.push(
        sqlSearchClause(
          LANDLORD_SEARCH_COLUMNS.map((c) => `l.${c}`),
          `$${params.length}`,
        ),
      );
    }
    if (filters.city?.trim()) {
      params.push(toLikePattern(filters.city));
      conditions.push(sqlSearchClause(['l.city'], `$${params.length}`));
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 'l');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const sql = `SELECT l.*,
                        (SELECT count(*) FROM properties p
                          WHERE p.landlord_id = l.id AND p.deleted_at IS NULL) AS properties_count
                   FROM landlords l
                  WHERE ${conditions.join(' AND ')}
                  ${keysetOrderBy('l')}
                  LIMIT ${keyset.fetch}`;

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<Array<LandlordRow & { properties_count: bigint }>>(sql, ...params),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return {
      items: page.items.map((r) => toLandlordView(r, Number(r.properties_count))),
      pageInfo: page.pageInfo,
    };
  }

  /** Fiche complète : bailleur, ses biens et ses comptes bancaires. */
  async get(organizationId: string, userId: string, id: string): Promise<LandlordView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = await this.require(tx, id);
      const propertiesCount = await tx.properties.count({
        where: { landlord_id: id, deleted_at: null },
      });
      return toLandlordView(row, propertiesCount);
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: LandlordInput,
  ): Promise<LandlordView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      const partyType = (input.partyType ?? before.party_type) as PartyType;
      assertPartyName({
        partyType,
        firstName: input.firstName ?? before.first_name,
        lastName: input.lastName ?? before.last_name,
        companyName: input.companyName ?? before.company_name,
      });

      const after = (await tx.landlords.update({
        where: { id },
        data: {
          ...(input.partyType !== undefined ? { party_type: partyType } : {}),
          ...this.toColumns(input, partyType),
          ...(input.primaryPhone !== undefined
            ? { primary_phone: normalizePartyPhone(input.primaryPhone) }
            : {}),
          updated_at: new Date(),
        },
      })) as unknown as LandlordRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.LANDLORD_UPDATED,
        entityType: 'landlords',
        entityId: id,
        previousState: toJsonState(toLandlordView(before)),
        newState: toJsonState(toLandlordView(after)),
      });
      return toLandlordView(after);
    });
  }

  /**
   * Suppression LOGIQUE. Deux refus : le bailleur « self » de l'organisation
   * est structurel, et un bailleur portant encore des biens laisserait des
   * `properties.landlord_id` orphelins (la FK est `ON DELETE RESTRICT`).
   */
  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      if (before.is_self) {
        throw new DomainError('PARTIES.SELF_LANDLORD_PROTECTED', { landlordId: id });
      }
      const properties = await tx.properties.count({
        where: { landlord_id: id, deleted_at: null },
      });
      if (properties > 0) {
        throw new DomainError('PARTIES.LANDLORD_HAS_PROPERTIES', {
          landlordId: id,
          propertiesCount: properties,
        });
      }

      await tx.landlords.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.LANDLORD_DELETED,
        entityType: 'landlords',
        entityId: id,
        previousState: toJsonState(toLandlordView(before)),
      });
    });
  }

  /** Lit un bailleur vivant, ou lève le 404 du contrat. */
  async require(tx: TenantClient, id: string): Promise<LandlordRow> {
    const row = (await tx.landlords.findFirst({
      where: { id, deleted_at: null },
    })) as unknown as LandlordRow | null;
    if (!row) throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: id });
    return row;
  }

  /** Traduction camelCase → colonnes SQL, en n'écrivant que le fourni. */
  private toColumns(input: LandlordInput, _partyType: PartyType): Record<string, unknown> {
    return {
      ...(input.firstName !== undefined ? { first_name: trimOrNull(input.firstName) } : {}),
      ...(input.lastName !== undefined ? { last_name: trimOrNull(input.lastName) } : {}),
      ...(input.companyName !== undefined ? { company_name: trimOrNull(input.companyName) } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.birthDate !== undefined ? { birth_date: toDateOrNull(input.birthDate) } : {}),
      ...(input.nationality !== undefined ? { nationality: trimOrNull(input.nationality) } : {}),
      ...(input.idDocumentType !== undefined ? { id_document_type: input.idDocumentType } : {}),
      ...(input.idDocumentNumber !== undefined
        ? { id_document_number: trimOrNull(input.idDocumentNumber) }
        : {}),
      ...(input.idDocumentExpiry !== undefined
        ? { id_document_expiry: toDateOrNull(input.idDocumentExpiry) }
        : {}),
      ...(input.idDocumentId !== undefined ? { id_document_id: input.idDocumentId } : {}),
      ...(input.rccmNumber !== undefined ? { rccm_number: trimOrNull(input.rccmNumber) } : {}),
      ...(input.niuNumber !== undefined ? { niu_number: trimOrNull(input.niuNumber) } : {}),
      ...(input.secondaryPhone !== undefined
        ? { secondary_phone: normalizeOptionalPhone(input.secondaryPhone, 'secondaryPhone') }
        : {}),
      ...(input.email !== undefined
        ? { email: trimOrNull(input.email)?.toLowerCase() ?? null }
        : {}),
      ...(input.addressLine !== undefined ? { address_line: trimOrNull(input.addressLine) } : {}),
      ...(input.district !== undefined ? { district: trimOrNull(input.district) } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.countryCode !== undefined ? { country_code: input.countryCode.toUpperCase() } : {}),
      ...(input.defaultBankAccountId !== undefined
        ? { default_bank_account_id: input.defaultBankAccountId }
        : {}),
      ...(input.payoutMethod !== undefined ? { payout_method: input.payoutMethod } : {}),
      ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
    };
  }
}

/** `YYYY-MM-DD` → `Date` UTC (colonne SQL `DATE`, jamais un instant local). */
export function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
