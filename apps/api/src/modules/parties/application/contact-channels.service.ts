import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  normalizeChannelValue,
  OWNER_PATH_TO_TYPE,
  trimOrNull,
  type ContactChannelType,
  type ContactOwnerType,
} from '../domain/party-rules';
import { toContactChannelView, type ContactChannelView } from './party-views';

export interface ContactChannelInput {
  channelType: ContactChannelType;
  value: string;
  label?: string | null;
  isPrimary?: boolean;
  optIn?: boolean;
}

export interface ContactChannelPatch {
  label?: string | null;
  isPrimary?: boolean;
  optIn?: boolean;
}

interface ChannelRow {
  id: string;
  owner_type: string;
  owner_id: string;
  channel_type: string;
  value: string;
  label: string | null;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: Date | null;
  opt_in: boolean;
  opt_out_at: Date | null;
  created_at: Date;
}

@Injectable()
export class ContactChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Traduit le segment d'URL (`landlords`, ...) en `contact_owner_type`. */
  resolveOwnerType(pathSegment: string): ContactOwnerType {
    const ownerType = OWNER_PATH_TO_TYPE[pathSegment];
    if (!ownerType) {
      throw new DomainError('PARTIES.OWNER_TYPE_INVALID', { ownerType: pathSegment });
    }
    return ownerType;
  }

  async list(
    organizationId: string,
    userId: string,
    pathSegment: string,
    ownerId: string,
  ): Promise<ContactChannelView[]> {
    const ownerType = this.resolveOwnerType(pathSegment);
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.requireOwner(tx, ownerType, ownerId);
      return this.listForOwner(tx, ownerType, ownerId);
    });
  }

  async listForOwner(
    tx: TenantClient,
    ownerType: ContactOwnerType,
    ownerId: string,
  ): Promise<ContactChannelView[]> {
    const rows = (await tx.contact_channels.findMany({
      where: { owner_type: ownerType, owner_id: ownerId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    })) as unknown as ChannelRow[];
    return rows.map(toContactChannelView);
  }

  async create(
    organizationId: string,
    userId: string,
    pathSegment: string,
    ownerId: string,
    input: ContactChannelInput,
  ): Promise<ContactChannelView> {
    const ownerType = this.resolveOwnerType(pathSegment);
    const value = normalizeChannelValue(input.channelType, input.value);
    const id = newId();

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      await this.requireOwner(tx, ownerType, ownerId);

      const duplicate = await tx.contact_channels.findFirst({
        where: {
          owner_type: ownerType,
          owner_id: ownerId,
          channel_type: input.channelType,
          value,
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new DomainError('PARTIES.CHANNEL_DUPLICATE', { existingChannelId: duplicate.id });
      }

      // Un seul canal principal par (tiers, type) : l'index unique partiel du
      // DDL le garantit, on démarque donc le précédent AVANT d'insérer.
      if (input.isPrimary === true) {
        await this.clearPrimary(tx, ownerType, ownerId, input.channelType);
      }

      const created = (await tx.contact_channels.create({
        data: {
          id,
          organization_id: organizationId,
          owner_type: ownerType,
          owner_id: ownerId,
          channel_type: input.channelType,
          value,
          label: trimOrNull(input.label),
          is_primary: input.isPrimary === true,
          opt_in: input.optIn !== false,
        },
      })) as unknown as ChannelRow;

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.CONTACT_CHANNEL_CREATED,
        entityType: 'contact_channels',
        entityId: id,
        newState: toJsonState(toContactChannelView(created)),
      });
      return toContactChannelView(created);
    });
  }

  async update(
    organizationId: string,
    userId: string,
    id: string,
    patch: ContactChannelPatch,
  ): Promise<ContactChannelView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);

      if (patch.isPrimary === true && !before.is_primary) {
        await this.clearPrimary(
          tx,
          before.owner_type as ContactOwnerType,
          before.owner_id,
          before.channel_type as ContactChannelType,
        );
      }

      const after = (await tx.contact_channels.update({
        where: { id },
        data: {
          ...(patch.label !== undefined ? { label: trimOrNull(patch.label) } : {}),
          ...(patch.isPrimary !== undefined ? { is_primary: patch.isPrimary } : {}),
          ...(patch.optIn !== undefined
            ? { opt_in: patch.optIn, opt_out_at: patch.optIn ? null : new Date() }
            : {}),
          updated_at: new Date(),
        },
      })) as unknown as ChannelRow;

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.CONTACT_CHANNEL_UPDATED,
        entityType: 'contact_channels',
        entityId: id,
        previousState: toJsonState(toContactChannelView(before)),
        newState: toJsonState(toContactChannelView(after)),
      });
      return toContactChannelView(after);
    });
  }

  /**
   * `contact_channels` n'a pas de `deleted_at` dans le DDL : c'est une
   * coordonnée, pas une entité de référence. La suppression y est donc
   * physique, mais tracée dans `audit_logs` avec l'état supprimé.
   */
  async remove(organizationId: string, userId: string, id: string): Promise<void> {
    await this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await this.require(tx, id);
      await tx.contact_channels.delete({ where: { id } });
      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.CONTACT_CHANNEL_DELETED,
        entityType: 'contact_channels',
        entityId: id,
        previousState: toJsonState(toContactChannelView(before)),
      });
    });
  }

  private async clearPrimary(
    tx: TenantClient,
    ownerType: ContactOwnerType,
    ownerId: string,
    channelType: ContactChannelType,
  ): Promise<void> {
    await tx.contact_channels.updateMany({
      where: {
        owner_type: ownerType,
        owner_id: ownerId,
        channel_type: channelType,
        is_primary: true,
      },
      data: { is_primary: false, updated_at: new Date() },
    });
  }

  private async require(tx: TenantClient, id: string): Promise<ChannelRow> {
    const row = (await tx.contact_channels.findUnique({
      where: { id },
    })) as unknown as ChannelRow | null;
    if (!row) throw new DomainError('PARTIES.CHANNEL_NOT_FOUND', { channelId: id });
    return row;
  }

  /** Le tiers porteur doit exister et être vivant dans l'organisation. */
  private async requireOwner(
    tx: TenantClient,
    ownerType: ContactOwnerType,
    ownerId: string,
  ): Promise<void> {
    const found =
      ownerType === 'LANDLORD'
        ? await tx.landlords.findFirst({
            where: { id: ownerId, deleted_at: null },
            select: { id: true },
          })
        : ownerType === 'TENANT'
          ? await tx.tenants.findFirst({
              where: { id: ownerId, deleted_at: null },
              select: { id: true },
            })
          : await tx.guarantors.findFirst({
              where: { id: ownerId, deleted_at: null },
              select: { id: true },
            });

    if (!found) {
      const code =
        ownerType === 'LANDLORD'
          ? 'PARTIES.LANDLORD_NOT_FOUND'
          : ownerType === 'TENANT'
            ? 'PARTIES.TENANT_NOT_FOUND'
            : 'PARTIES.GUARANTOR_NOT_FOUND';
      throw new DomainError(code, { ownerId, ownerType });
    }
  }
}
