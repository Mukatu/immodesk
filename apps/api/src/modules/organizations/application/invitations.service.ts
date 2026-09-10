import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  NotificationsService,
  TEMPLATE_CODES,
} from '../../notifications/application/notifications.service';
import {
  buildInvitationLink,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from '../domain/invitation-token';

export interface InvitationView {
  id: string;
  phone: string;
  role: MemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface PublicInvitationView {
  organizationName: string;
  role: MemberRole;
  expiresAt: string;
}

export interface AcceptedMembershipView {
  organizationId: string;
  role: MemberRole;
  joinedAt: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: TenantDirectoryService,
    private readonly notifications: NotificationsService,
    private readonly auditService: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async list(organizationId: string, userId: string): Promise<InvitationView[]> {
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.invitations.findMany({
        where: { organization_id: organizationId },
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
    );
    return rows.map(toInvitationView);
  }

  /** Invite un collaborateur par téléphone et lui envoie le lien par SMS. */
  async create(
    organizationId: string,
    actorUserId: string,
    input: { phone: string; role: MemberRole; fullName?: string },
  ): Promise<InvitationView> {
    const phone = normalizePhoneE164(input.phone);
    const token = generateInvitationToken();
    const now = new Date();

    const invitation = await this.prisma.withTenant(organizationId, actorUserId, async (tx) => {
      const alreadyMember = await tx.organization_members.findFirst({
        where: { organization_id: organizationId, status: 'ACTIVE' },
        select: { id: true, user_id: true },
      });
      if (alreadyMember) {
        const user = await tx.users.findUnique({
          where: { phone_e164: phone },
          select: { id: true },
        });
        if (user) {
          const existing = await tx.organization_members.findFirst({
            where: { organization_id: organizationId, user_id: user.id, status: 'ACTIVE' },
            select: { id: true },
          });
          if (existing) throw new DomainError('ORG.ALREADY_MEMBER', { phone });
        }
      }

      // Les invitations en attente pour ce numéro sont révoquées : un seul
      // lien vivant par destinataire.
      await tx.invitations.updateMany({
        where: { organization_id: organizationId, phone_e164: phone, status: 'PENDING' },
        data: { status: 'REVOKED', revoked_at: now },
      });

      const created = await tx.invitations.create({
        data: {
          id: newId(),
          organization_id: organizationId,
          phone_e164: phone,
          role: input.role,
          token_hash: hashInvitationToken(token),
          status: 'PENDING',
          invited_by_user_id: actorUserId,
          expires_at: invitationExpiresAt(now, this.config.INVITATION_TTL_DAYS),
        },
      });

      await audit(this.auditService, tx, {
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.INVITATION_CREATED,
        entityType: 'invitations',
        entityId: created.id,
        newState: toJsonState({ phone, role: input.role, fullName: input.fullName ?? null }),
      });

      return created;
    });

    const organization = await this.prisma.withTenant(organizationId, actorUserId, (tx) =>
      tx.organizations.findUnique({
        where: { id: organizationId },
        select: { trade_name: true, legal_name: true },
      }),
    );

    await this.notifications.sendTemplated({
      organizationId,
      to: phone,
      templateCode: TEMPLATE_CODES.INVITATION,
      variables: {
        organization: organization?.trade_name ?? organization?.legal_name ?? 'Immodesk',
        role: input.role,
        link: buildInvitationLink(this.config.INVITATION_BASE_URL, token),
      },
      fallbackBody:
        'Immodesk : {{organization}} vous invite à rejoindre son équipe en tant que {{role}}. Acceptez ici : {{link}}',
      relatedEntityType: 'invitations',
      relatedEntityId: invitation.id,
    });

    return toInvitationView(invitation);
  }

  async revoke(organizationId: string, actorUserId: string, invitationId: string): Promise<void> {
    await this.prisma.withTenant(organizationId, actorUserId, async (tx) => {
      const invitation = await tx.invitations.findFirst({
        where: { id: invitationId, organization_id: organizationId },
        select: { id: true, status: true },
      });
      if (!invitation) throw new DomainError('INVITATION.NOT_FOUND', { invitationId });
      if (invitation.status !== 'PENDING') {
        throw new DomainError('INVITATION.ALREADY_USED', { invitationId });
      }

      await tx.invitations.update({
        where: { id: invitationId },
        data: { status: 'REVOKED', revoked_at: new Date() },
      });

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INVITATION_REVOKED,
        entityType: 'invitations',
        entityId: invitationId,
        previousState: toJsonState({ status: 'PENDING' }),
        newState: toJsonState({ status: 'REVOKED' }),
      });
    });
  }

  /**
   * Lecture publique de l'entête d'une invitation.
   * L'organisation n'étant pas connue de l'appelant, la résolution passe par
   * l'annuaire ; le jeton lui-même fait office d'autorisation.
   */
  async peek(token: string): Promise<PublicInvitationView> {
    const invitation = await this.directory.findInvitationByTokenHash(hashInvitationToken(token));
    if (!invitation) throw new DomainError('INVITATION.NOT_FOUND');
    this.assertUsable(invitation.status, invitation.expiresAt);
    return {
      organizationName: invitation.organizationName,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  /** Accepte une invitation et crée l'adhésion correspondante. */
  async accept(token: string, userId: string): Promise<AcceptedMembershipView> {
    const invitation = await this.directory.findInvitationByTokenHash(hashInvitationToken(token));
    if (!invitation) throw new DomainError('INVITATION.NOT_FOUND');
    this.assertUsable(invitation.status, invitation.expiresAt);

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { phone_e164: true },
    });
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');

    // L'invitation est nominative : seul le titulaire du numéro invité peut
    // l'accepter, même si le lien a été transféré.
    if (invitation.phoneE164 && invitation.phoneE164 !== user.phone_e164) {
      throw new DomainError('INVITATION.PHONE_MISMATCH');
    }

    return this.prisma.withTenant(invitation.organizationId, userId, async (tx) => {
      // Consommation atomique : deux acceptations concurrentes du même lien
      // ne peuvent pas créer deux adhésions.
      const consumed = await tx.invitations.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', accepted_at: new Date(), accepted_user_id: userId },
      });
      if (consumed.count === 0) throw new DomainError('INVITATION.ALREADY_USED');

      const existing = await tx.organization_members.findFirst({
        where: { organization_id: invitation.organizationId, user_id: userId },
        select: { id: true, status: true },
      });

      const membership = existing
        ? await tx.organization_members.update({
            where: { id: existing.id },
            data: {
              role: invitation.role,
              status: 'ACTIVE',
              left_at: null,
              updated_at: new Date(),
            },
            select: { id: true, role: true, joined_at: true },
          })
        : await tx.organization_members.create({
            data: {
              id: newId(),
              organization_id: invitation.organizationId,
              user_id: userId,
              role: invitation.role,
              status: 'ACTIVE',
            },
            select: { id: true, role: true, joined_at: true },
          });

      await this.auditService.record(tx, {
        organizationId: invitation.organizationId,
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.INVITATION_ACCEPTED,
        entityType: 'invitations',
        entityId: invitation.id,
        actorUserId: userId,
        actorRole: invitation.role,
        previousState: toJsonState({ status: 'PENDING' }),
        newState: toJsonState({ status: 'ACCEPTED', memberId: membership.id, role: invitation.role }),
      });

      return {
        organizationId: invitation.organizationId,
        role: membership.role as MemberRole,
        joinedAt: membership.joined_at.toISOString(),
      };
    });
  }

  private assertUsable(status: string, expiresAt: Date): void {
    if (status === 'REVOKED') throw new DomainError('INVITATION.REVOKED');
    if (status === 'ACCEPTED') throw new DomainError('INVITATION.ALREADY_USED');
    if (status === 'EXPIRED' || expiresAt.getTime() <= Date.now()) {
      throw new DomainError('INVITATION.EXPIRED');
    }
  }
}

function toInvitationView(row: {
  id: string;
  phone_e164: string | null;
  role: string;
  status: string;
  expires_at: Date;
  created_at: Date;
}): InvitationView {
  return {
    id: row.id,
    phone: row.phone_e164 ?? '',
    role: row.role as MemberRole,
    status: row.status as InvitationView['status'],
    expiresAt: row.expires_at.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}
