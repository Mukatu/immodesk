import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { TenantLeaseRow } from '../../../shared/prisma/tenant-directory.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { NOTIFICATION_ENQUEUER, type NotificationEnqueuer } from '../../notifications/domain/ports';
import { groupLeasesByOrganization } from '../../tenant-portal/application/tenant-portal-scope';
import type { TenantChannelView } from './tenant-privacy.service';

/**
 * `PATCH /v1/tenant/privacy/channels/{id}` et `POST /v1/tenant/privacy/erasure-requests` :
 * séparé de `TenantPrivacyService` (au-delà de 180 lignes réunis). Le
 * locataire **demande** son effacement, il ne le déclenche jamais (contrat
 * § « Consentement et portail locataire », dernier point) : la route crée une
 * notification à destination des `OWNER` et une trace d'audit, rien de plus.
 */
@Injectable()
export class TenantPrivacyActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(NOTIFICATION_ENQUEUER) private readonly notifications: NotificationEnqueuer,
  ) {}

  async updateChannel(
    leases: readonly TenantLeaseRow[],
    userId: string,
    channelId: string,
    optIn: boolean,
  ): Promise<TenantChannelView> {
    const byOrg = groupLeasesByOrganization(leases);
    for (const [organizationId, orgLeases] of byOrg) {
      const tenantId = orgLeases[0].tenantId;
      const result = await this.prisma.withTenant(organizationId, userId, async (tx) => {
        const before = await tx.contact_channels.findFirst({
          where: { id: channelId, owner_type: 'TENANT', owner_id: tenantId },
        });
        if (!before) return null;

        if (!optIn && before.opt_in) {
          const otherJoinable = await tx.contact_channels.count({
            where: {
              owner_type: 'TENANT',
              owner_id: tenantId,
              opt_in: true,
              NOT: { id: channelId },
            },
          });
          if (otherJoinable === 0)
            throw new DomainError('PRIVACY.LAST_CHANNEL_PROTECTED', { channelId });
        }

        const after = await tx.contact_channels.update({
          where: { id: channelId },
          data: { opt_in: optIn, opt_out_at: optIn ? null : new Date(), updated_at: new Date() },
        });
        await audit(this.auditService, tx, {
          action: 'UPDATE',
          operation: AUDIT_OPERATIONS.PRIVACY_CHANNEL_OPT_CHANGED,
          entityType: 'contact_channels',
          entityId: channelId,
          previousState: toJsonState({ optIn: before.opt_in }),
          newState: toJsonState({ optIn: after.opt_in }),
        });
        return {
          id: after.id,
          channelType: after.channel_type,
          value: after.value,
          optIn: after.opt_in,
          isPrimary: after.is_primary,
        } satisfies TenantChannelView;
      });
      if (result) return result;
    }
    throw new DomainError('PARTIES.CHANNEL_NOT_FOUND', { channelId });
  }

  /** `202 { requestRef }` : une DEMANDE, jamais une exécution. */
  async requestErasure(
    leases: readonly TenantLeaseRow[],
    userId: string,
  ): Promise<{ requestRef: string }> {
    const requestRef = `ERQ-${newId().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const byOrg = groupLeasesByOrganization(leases);

    for (const [organizationId, orgLeases] of byOrg) {
      const tenantId = orgLeases[0].tenantId;
      await this.prisma.withTenant(organizationId, userId, async (tx) => {
        await audit(this.auditService, tx, {
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.PRIVACY_ERASURE_REQUESTED,
          entityType: 'tenants',
          entityId: tenantId,
          newState: toJsonState({ requestRef, source: 'TENANT_PORTAL' }),
        });

        const owners = await tx.organization_members.findMany({
          where: { organization_id: organizationId, role: 'OWNER', status: 'ACTIVE' },
          select: { user_id: true },
        });
        const ownerUsers = await tx.users.findMany({
          where: { id: { in: owners.map((o) => o.user_id) } },
          select: { id: true, phone_e164: true },
        });
        for (const owner of ownerUsers) {
          await this.notifications.enqueue({
            organizationId,
            templateCode: `Demande d'effacement RGPD reçue (référence ${requestRef}). Vérifiez l'identité du locataire avant de la valider dans le centre de confidentialité.`,
            recipient: { phone: owner.phone_e164, userId: owner.id },
            variables: {},
            dedupeKey: `privacy-erasure-request-${tenantId}-${requestRef}`,
            actorUserId: userId,
          });
        }
      });
    }
    return { requestRef };
  }
}
