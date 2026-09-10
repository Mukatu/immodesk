import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { buildPage, type Page } from '../../../shared/pagination/cursor';
import { buildKeyset, keysetOrderBy } from '../../../shared/pagination/keyset';
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
import { toDateOrNull } from './landlords.service';
import { toTenantView, type TenantRow, type TenantView } from './tenant-views';

export interface TenantInput {
  partyType?: PartyType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  gender?: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  nationality?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  idDocumentExpiry?: string | null;
  idDocumentId?: string | null;
  rccmNumber?: string | null;
  niuNumber?: string | null;
  profession?: string | null;
  employerName?: string | null;
  monthlyIncome?: number | string | null;
  primaryPhone?: string;
  secondaryPhone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  addressLine?: string | null;
  district?: string | null;
  city?: string;
  countryCode?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  clientRef?: string | null;
  notes?: string | null;
  confirmDuplicatePhone?: boolean;
}

const TENANT_SEARCH_COLUMNS = [
  'first_name',
  'last_name',
  'company_name',
  'primary_phone',
  'secondary_phone',
  'whatsapp_phone',
];

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Un même numéro peut légitimement servir à plusieurs locataires d'un même
   * foyer. L'unicité est donc un AVERTISSEMENT et non un blocage : la
   * première tentative répond 409 `PARTIES.PHONE_ALREADY_USED` en désignant
   * le locataire existant, et la même requête accompagnée de
   * `confirmDuplicatePhone: true` passe.
   */
  async create(organizationId: string, userId: string, input: TenantInput): Promise<TenantView> {
    const partyType = input.partyType ?? 'INDIVIDUAL';
    assertPartyName({ ...input, partyType });
    const primaryPhone = normalizePartyPhone(input.primaryPhone ?? '');
    const id = newId();

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      if (input.confirmDuplicatePhone !== true) {
        const existing = await tx.tenants.findFirst({
          where: { primary_phone: primaryPhone, deleted_at: null },
          select: { id: true, first_name: true, last_name: true, company_name: true },
          orderBy: { created_at: 'asc' },
        });
        if (existing) {
          throw new DomainError('PARTIES.PHONE_ALREADY_USED', {
            existingTenantId: existing.id,
            phone: primaryPhone,
            hint: 'Renvoyez la requête avec confirmDuplicatePhone: true pour confirmer.',
          });
        }
      }

      const created = (await tx.tenants.create({
        data: {
          id,
          organization_id: organizationId,
          party_type: partyType,
          currency: 'XAF',
          ...this.toColumns(input),
          primary_phone: primaryPhone,
        },
      })) as unknown as TenantRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.TENANT_CREATED,
        entityType: 'tenants',
        entityId: id,
        newState: toJsonState({
          ...toTenantView(created),
          duplicatePhoneConfirmed: input.confirmDuplicatePhone === true,
        }),
      });
      return toTenantView(created);
    });
  }

  async list(
    organizationId: string,
    userId: string,
    filters: { q?: string; limit?: number; cursor?: string },
  ): Promise<Page<TenantView>> {
    const conditions = ['t.organization_id = $1::uuid', 't.deleted_at IS NULL'];
    const params: unknown[] = [organizationId];

    if (filters.q?.trim()) {
      params.push(toLikePattern(filters.q));
      conditions.push(
        sqlSearchClause(
          TENANT_SEARCH_COLUMNS.map((c) => `t.${c}`),
          `$${params.length}`,
        ),
      );
    }

    const keyset = buildKeyset(filters, this.config.get('CURSOR_SECRET'), params.length + 1, 't');
    if (keyset.condition) {
      conditions.push(keyset.condition);
      params.push(...keyset.params);
    }

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<TenantRow[]>(
        `SELECT t.* FROM tenants t
          WHERE ${conditions.join(' AND ')}
          ${keysetOrderBy('t')}
          LIMIT ${keyset.fetch}`,
        ...params,
      ),
    );

    const page = buildPage(rows, keyset.limit, this.config.get('CURSOR_SECRET'));
    return { items: page.items.map(toTenantView), pageInfo: page.pageInfo };
  }

  async get(organizationId: string, userId: string, id: string): Promise<TenantView> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) => this.require(tx, id));
    return toTenantView(row);
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: TenantInput,
  ): Promise<TenantView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      const partyType = (input.partyType ?? before.party_type) as PartyType;
      assertPartyName({
        partyType,
        firstName: input.firstName ?? before.first_name,
        lastName: input.lastName ?? before.last_name,
        companyName: input.companyName ?? before.company_name,
      });

      const after = (await tx.tenants.update({
        where: { id },
        data: {
          ...(input.partyType !== undefined ? { party_type: partyType } : {}),
          ...this.toColumns(input),
          ...(input.primaryPhone !== undefined
            ? { primary_phone: normalizePartyPhone(input.primaryPhone) }
            : {}),
          updated_at: new Date(),
        },
      })) as unknown as TenantRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.TENANT_UPDATED,
        entityType: 'tenants',
        entityId: id,
        previousState: toJsonState(toTenantView(before)),
        newState: toJsonState(toTenantView(after)),
      });
      return toTenantView(after);
    });
  }

  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      await tx.tenants.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.TENANT_DELETED,
        entityType: 'tenants',
        entityId: id,
        previousState: toJsonState(toTenantView(before)),
      });
    });
  }

  async require(tx: TenantClient, id: string): Promise<TenantRow> {
    const row = (await tx.tenants.findFirst({
      where: { id, deleted_at: null },
    })) as unknown as TenantRow | null;
    if (!row) throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId: id });
    return row;
  }

  private toColumns(input: TenantInput): Record<string, unknown> {
    return {
      ...(input.firstName !== undefined ? { first_name: trimOrNull(input.firstName) } : {}),
      ...(input.lastName !== undefined ? { last_name: trimOrNull(input.lastName) } : {}),
      ...(input.companyName !== undefined ? { company_name: trimOrNull(input.companyName) } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.birthDate !== undefined ? { birth_date: toDateOrNull(input.birthDate) } : {}),
      ...(input.birthPlace !== undefined ? { birth_place: trimOrNull(input.birthPlace) } : {}),
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
      ...(input.profession !== undefined ? { profession: trimOrNull(input.profession) } : {}),
      ...(input.employerName !== undefined
        ? { employer_name: trimOrNull(input.employerName) }
        : {}),
      ...(input.monthlyIncome !== undefined
        ? { monthly_income: input.monthlyIncome === null ? null : BigInt(input.monthlyIncome) }
        : {}),
      ...(input.secondaryPhone !== undefined
        ? { secondary_phone: normalizeOptionalPhone(input.secondaryPhone, 'secondaryPhone') }
        : {}),
      ...(input.whatsappPhone !== undefined
        ? { whatsapp_phone: normalizeOptionalPhone(input.whatsappPhone, 'whatsappPhone') }
        : {}),
      ...(input.email !== undefined
        ? { email: trimOrNull(input.email)?.toLowerCase() ?? null }
        : {}),
      ...(input.addressLine !== undefined ? { address_line: trimOrNull(input.addressLine) } : {}),
      ...(input.district !== undefined ? { district: trimOrNull(input.district) } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.countryCode !== undefined ? { country_code: input.countryCode.toUpperCase() } : {}),
      ...(input.emergencyContactName !== undefined
        ? { emergency_contact_name: trimOrNull(input.emergencyContactName) }
        : {}),
      ...(input.emergencyContactPhone !== undefined
        ? {
            emergency_contact_phone: normalizeOptionalPhone(
              input.emergencyContactPhone,
              'emergencyContactPhone',
            ),
          }
        : {}),
      ...(input.clientRef !== undefined ? { client_ref: trimOrNull(input.clientRef) } : {}),
      ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
    };
  }
}
