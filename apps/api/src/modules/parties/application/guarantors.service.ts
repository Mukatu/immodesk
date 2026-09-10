import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  assertPartyName,
  normalizePartyPhone,
  trimOrNull,
  type PartyType,
} from '../domain/party-rules';
import { TenantsService } from './tenants.service';
import { toGuarantorView, type GuarantorRow, type GuarantorView } from './tenant-views';

export interface GuarantorInput {
  partyType?: PartyType;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  relationship?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  idDocumentId?: string | null;
  profession?: string | null;
  employerName?: string | null;
  monthlyIncome?: number | string | null;
  guaranteeAmount?: number | string | null;
  primaryPhone?: string;
  email?: string | null;
  addressLine?: string | null;
  district?: string | null;
  city?: string;
  countryCode?: string;
  notes?: string | null;
}

@Injectable()
export class GuarantorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tenants: TenantsService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    tenantId: string,
    input: GuarantorInput,
  ): Promise<GuarantorView> {
    const partyType = input.partyType ?? 'INDIVIDUAL';
    assertPartyName({ ...input, partyType });
    const id = newId();

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      // Le locataire est relu sous RLS : un identifiant d'une autre
      // organisation est indiscernable d'un identifiant inexistant (404).
      await this.tenants.require(tx, tenantId);

      const created = (await tx.guarantors.create({
        data: {
          id,
          organization_id: organizationId,
          tenant_id: tenantId,
          party_type: partyType,
          currency: 'XAF',
          ...this.toColumns(input),
          primary_phone: normalizePartyPhone(input.primaryPhone ?? ''),
        },
      })) as unknown as GuarantorRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.GUARANTOR_CREATED,
        entityType: 'guarantors',
        entityId: id,
        newState: toJsonState(toGuarantorView(created)),
      });
      return toGuarantorView(created);
    });
  }

  async listForTenant(tx: TenantClient, tenantId: string): Promise<GuarantorView[]> {
    const rows = (await tx.guarantors.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: { created_at: 'asc' },
    })) as unknown as GuarantorRow[];
    return rows.map(toGuarantorView);
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    input: GuarantorInput,
  ): Promise<GuarantorView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      const partyType = (input.partyType ?? before.party_type) as PartyType;
      assertPartyName({
        partyType,
        firstName: input.firstName ?? before.first_name,
        lastName: input.lastName ?? before.last_name,
        companyName: input.companyName ?? before.company_name,
      });

      const after = (await tx.guarantors.update({
        where: { id },
        data: {
          ...(input.partyType !== undefined ? { party_type: partyType } : {}),
          ...this.toColumns(input),
          ...(input.primaryPhone !== undefined
            ? { primary_phone: normalizePartyPhone(input.primaryPhone) }
            : {}),
          updated_at: new Date(),
        },
      })) as unknown as GuarantorRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.GUARANTOR_UPDATED,
        entityType: 'guarantors',
        entityId: id,
        previousState: toJsonState(toGuarantorView(before)),
        newState: toJsonState(toGuarantorView(after)),
      });
      return toGuarantorView(after);
    });
  }

  async softDelete(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      await tx.guarantors.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.GUARANTOR_DELETED,
        entityType: 'guarantors',
        entityId: id,
        previousState: toJsonState(toGuarantorView(before)),
      });
    });
  }

  private async require(tx: TenantClient, id: string): Promise<GuarantorRow> {
    const row = (await tx.guarantors.findFirst({
      where: { id, deleted_at: null },
    })) as unknown as GuarantorRow | null;
    if (!row) throw new DomainError('PARTIES.GUARANTOR_NOT_FOUND', { guarantorId: id });
    return row;
  }

  private toColumns(input: GuarantorInput): Record<string, unknown> {
    return {
      ...(input.firstName !== undefined ? { first_name: trimOrNull(input.firstName) } : {}),
      ...(input.lastName !== undefined ? { last_name: trimOrNull(input.lastName) } : {}),
      ...(input.companyName !== undefined ? { company_name: trimOrNull(input.companyName) } : {}),
      ...(input.relationship !== undefined ? { relationship: trimOrNull(input.relationship) } : {}),
      ...(input.idDocumentType !== undefined ? { id_document_type: input.idDocumentType } : {}),
      ...(input.idDocumentNumber !== undefined
        ? { id_document_number: trimOrNull(input.idDocumentNumber) }
        : {}),
      ...(input.idDocumentId !== undefined ? { id_document_id: input.idDocumentId } : {}),
      ...(input.profession !== undefined ? { profession: trimOrNull(input.profession) } : {}),
      ...(input.employerName !== undefined
        ? { employer_name: trimOrNull(input.employerName) }
        : {}),
      ...(input.monthlyIncome !== undefined
        ? { monthly_income: input.monthlyIncome === null ? null : BigInt(input.monthlyIncome) }
        : {}),
      ...(input.guaranteeAmount !== undefined
        ? {
            guarantee_amount: input.guaranteeAmount === null ? null : BigInt(input.guaranteeAmount),
          }
        : {}),
      ...(input.email !== undefined
        ? { email: trimOrNull(input.email)?.toLowerCase() ?? null }
        : {}),
      ...(input.addressLine !== undefined ? { address_line: trimOrNull(input.addressLine) } : {}),
      ...(input.district !== undefined ? { district: trimOrNull(input.district) } : {}),
      ...(input.city !== undefined ? { city: input.city.trim() } : {}),
      ...(input.countryCode !== undefined ? { country_code: input.countryCode.toUpperCase() } : {}),
      ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
    };
  }
}
