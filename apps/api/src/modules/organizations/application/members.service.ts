import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import { assertNotLastOwner } from '../domain/membership-rules';

export interface MemberView {
  id: string;
  user: { id: string; phone: string; fullName: string };
  role: MemberRole;
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(organizationId: string, userId: string): Promise<MemberView[]> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const members = await tx.organization_members.findMany({
        where: { organization_id: organizationId, status: { not: 'REMOVED' } },
        orderBy: [{ role: 'asc' }, { joined_at: 'asc' }],
        select: { id: true, user_id: true, role: true, status: true, joined_at: true },
      });
      return this.hydrate(tx, members);
    });
  }

  /** Change le rôle d'un membre. Le dernier OWNER ne peut pas être rétrogradé. */
  async changeRole(
    organizationId: string,
    actorUserId: string,
    memberId: string,
    nextRole: MemberRole,
  ): Promise<MemberView> {
    return this.prisma.withTenant(organizationId, actorUserId, async (tx) => {
      const member = await this.findMember(tx, organizationId, memberId);

      if (member.role !== nextRole) {
        assertNotLastOwner({
          activeOwnerCount: await this.countActiveOwners(tx, organizationId),
          currentRole: member.role as MemberRole,
          nextRole,
        });
      }

      const updated = await tx.organization_members.update({
        where: { id: memberId },
        data: { role: nextRole, updated_at: new Date() },
        select: { id: true, user_id: true, role: true, status: true, joined_at: true },
      });

      await audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.MEMBER_ROLE_CHANGED,
        entityType: 'organization_members',
        entityId: memberId,
        previousState: toJsonState({ role: member.role, userId: member.user_id }),
        newState: toJsonState({ role: nextRole, userId: member.user_id }),
      });

      const [view] = await this.hydrate(tx, [updated]);
      return view;
    });
  }

  /**
   * Retire un membre : l'adhésion passe en REMOVED et `left_at` est daté.
   * La ligne est conservée pour que l'historique d'audit reste lisible.
   */
  async remove(organizationId: string, actorUserId: string, memberId: string): Promise<void> {
    await this.prisma.withTenant(organizationId, actorUserId, async (tx) => {
      const member = await this.findMember(tx, organizationId, memberId);

      assertNotLastOwner({
        activeOwnerCount: await this.countActiveOwners(tx, organizationId),
        currentRole: member.role as MemberRole,
        nextRole: null,
      });

      await tx.organization_members.update({
        where: { id: memberId },
        data: { status: 'REMOVED', left_at: new Date(), updated_at: new Date() },
      });

      await audit(this.auditService, tx, {
        action: 'DELETE',
        operation: AUDIT_OPERATIONS.MEMBER_REMOVED,
        entityType: 'organization_members',
        entityId: memberId,
        previousState: toJsonState({ role: member.role, status: member.status, userId: member.user_id }),
        newState: toJsonState({ status: 'REMOVED', userId: member.user_id }),
      });
    });
  }

  private async findMember(
    tx: TenantClient,
    organizationId: string,
    memberId: string,
  ): Promise<{ id: string; user_id: string; role: string; status: string }> {
    const member = await tx.organization_members.findFirst({
      where: { id: memberId, organization_id: organizationId, status: { not: 'REMOVED' } },
      select: { id: true, user_id: true, role: true, status: true },
    });
    // La RLS filtre déjà les autres organisations : un membre invisible est
    // un membre inexistant (404, jamais 403).
    if (!member) throw new DomainError('ORG.MEMBER_NOT_FOUND', { memberId });
    return member;
  }

  private async countActiveOwners(tx: TenantClient, organizationId: string): Promise<number> {
    return tx.organization_members.count({
      where: { organization_id: organizationId, role: 'OWNER', status: 'ACTIVE' },
    });
  }

  /**
   * `users` est une table globale sans `organization_id` : elle se lit
   * directement, en restreignant aux identifiants déjà obtenus sous RLS.
   */
  private async hydrate(
    tx: TenantClient,
    members: Array<{
      id: string;
      user_id: string;
      role: string;
      status: string;
      joined_at: Date;
    }>,
  ): Promise<MemberView[]> {
    if (members.length === 0) return [];
    const users = await tx.users.findMany({
      where: { id: { in: members.map((m) => m.user_id) } },
      select: { id: true, phone_e164: true, display_name: true, first_name: true, last_name: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return members.map((member) => {
      const user = byId.get(member.user_id);
      return {
        id: member.id,
        user: {
          id: member.user_id,
          phone: user?.phone_e164 ?? '',
          fullName:
            user?.display_name ??
            [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim(),
        },
        role: member.role as MemberRole,
        status: member.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
        joinedAt: member.joined_at.toISOString(),
      };
    });
  }
}
