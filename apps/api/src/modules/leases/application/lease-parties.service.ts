import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import type { LeasePartyRole } from '../domain/lease-status';
import { toLeasePartyView, type LeasePartyRow, type LeasePartyView } from './lease-views';
import { LeasesService } from './leases.service';

export interface LeasePartyInput {
  role: LeasePartyRole;
  tenantId?: string;
  guarantorId?: string;
  shareBps?: number;
  isSolidary?: boolean;
}

@Injectable()
export class LeasePartiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leases: LeasesService,
  ) {}

  /**
   * Ajoute une partie au bail.
   *
   * `lease_parties_target_chk` impose déjà, en base, qu'un GUARANTOR porte
   * `guarantor_id` et toute autre partie `tenant_id`. Le contrôle est doublé
   * ici pour rendre un 422 lisible plutôt qu'une erreur SQL.
   */
  async add(
    organizationId: string,
    userId: string,
    leaseId: string,
    input: LeasePartyInput,
  ): Promise<LeasePartyView> {
    assertPartyShape(input);

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.leases.require(tx, leaseId);
      await this.assertPartyFree(tx, leaseId, input);

      const id = newId();
      const created = (await tx.lease_parties.create({
        data: {
          id,
          organization_id: organizationId,
          lease_id: leaseId,
          role: input.role,
          tenant_id: input.role === 'GUARANTOR' ? null : (input.tenantId as string),
          guarantor_id: input.role === 'GUARANTOR' ? (input.guarantorId as string) : null,
          share_bps: input.shareBps ?? 10_000,
          is_solidary: input.isSolidary ?? true,
        },
      })) as unknown as LeasePartyRow;

      const view = toLeasePartyView(created, await this.displayNameOf(tx, created));
      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.LEASE_PARTY_ADDED,
        entityType: 'lease_parties',
        entityId: id,
        newState: toJsonState(view),
      });
      return view;
    });
  }

  async update(
    organizationId: string,
    userId: string,
    leaseId: string,
    partyId: string,
    input: { shareBps?: number; isSolidary?: boolean },
  ): Promise<LeasePartyView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, leaseId, partyId);

      const after = (await tx.lease_parties.update({
        where: { id: partyId },
        data: {
          ...(input.shareBps !== undefined ? { share_bps: input.shareBps } : {}),
          ...(input.isSolidary !== undefined ? { is_solidary: input.isSolidary } : {}),
          updated_at: new Date(),
        },
      })) as unknown as LeasePartyRow;

      const displayName = await this.displayNameOf(tx, after);
      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.LEASE_PARTY_UPDATED,
        entityType: 'lease_parties',
        entityId: partyId,
        previousState: toJsonState(toLeasePartyView(before, displayName)),
        newState: toJsonState(toLeasePartyView(after, displayName)),
      });
      return toLeasePartyView(after, displayName);
    });
  }

  /**
   * Retire une partie. Le locataire principal est protégé : il est la
   * contrepartie du contrat, et un bail sans lui n'aurait plus de débiteur.
   */
  async remove(
    organizationId: string,
    userId: string,
    leaseId: string,
    partyId: string,
  ): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, leaseId, partyId);
      if (before.role === 'PRIMARY_TENANT') {
        throw new DomainError('LEASES.PRIMARY_TENANT_PROTECTED', { leaseId, partyId });
      }

      const displayName = await this.displayNameOf(tx, before);
      await tx.lease_parties.delete({ where: { id: partyId } });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.LEASE_PARTY_REMOVED,
        entityType: 'lease_parties',
        entityId: partyId,
        previousState: toJsonState(toLeasePartyView(before, displayName)),
      });
    });
  }

  /** Parties d'un bail, locataire principal en tête. */
  async listFor(tx: TenantClient, leaseId: string): Promise<LeasePartyView[]> {
    const rows = (await tx.lease_parties.findMany({
      where: { lease_id: leaseId },
      orderBy: { created_at: 'asc' },
    })) as unknown as LeasePartyRow[];

    const views: LeasePartyView[] = [];
    for (const row of rows) {
      views.push(toLeasePartyView(row, await this.displayNameOf(tx, row)));
    }
    return views.sort(
      (a, b) => Number(b.role === 'PRIMARY_TENANT') - Number(a.role === 'PRIMARY_TENANT'),
    );
  }

  private async require(
    tx: TenantClient,
    leaseId: string,
    partyId: string,
  ): Promise<LeasePartyRow> {
    const row = (await tx.lease_parties.findFirst({
      where: { id: partyId, lease_id: leaseId },
    })) as unknown as LeasePartyRow | null;
    if (!row) throw new DomainError('LEASES.PARTY_NOT_FOUND', { leaseId, partyId });
    return row;
  }

  private async assertPartyFree(
    tx: TenantClient,
    leaseId: string,
    input: LeasePartyInput,
  ): Promise<void> {
    const existing = await tx.lease_parties.findFirst({
      where: {
        lease_id: leaseId,
        ...(input.role === 'GUARANTOR'
          ? { guarantor_id: input.guarantorId }
          : { tenant_id: input.tenantId }),
      },
      select: { id: true },
    });
    if (existing) {
      throw new DomainError('LEASES.PARTY_DUPLICATE', { leaseId, existingPartyId: existing.id });
    }
    if (input.role === 'PRIMARY_TENANT') {
      const primary = await tx.lease_parties.findFirst({
        where: { lease_id: leaseId, role: 'PRIMARY_TENANT' },
        select: { id: true },
      });
      if (primary) {
        throw new DomainError('LEASES.PARTY_DUPLICATE', { leaseId, existingPartyId: primary.id });
      }
    }
  }

  /** Nom affiché du tiers désigné, composé par la règle commune de `parties`. */
  private async displayNameOf(tx: TenantClient, row: LeasePartyRow): Promise<string> {
    const source = row.guarantor_id
      ? await tx.guarantors.findFirst({ where: { id: row.guarantor_id } })
      : row.tenant_id
        ? await tx.tenants.findFirst({ where: { id: row.tenant_id } })
        : null;
    if (!source) return '';
    return displayNameOf({
      partyType: source.party_type as PartyType,
      firstName: source.first_name,
      lastName: source.last_name,
      companyName: source.company_name,
    });
  }
}

function assertPartyShape(input: LeasePartyInput): void {
  const wantsGuarantor = input.role === 'GUARANTOR';
  if (wantsGuarantor && !input.guarantorId) {
    throw new DomainError('LEASES.PARTY_INVALID', { role: input.role, missing: 'guarantorId' });
  }
  if (!wantsGuarantor && !input.tenantId) {
    throw new DomainError('LEASES.PARTY_INVALID', { role: input.role, missing: 'tenantId' });
  }
}
