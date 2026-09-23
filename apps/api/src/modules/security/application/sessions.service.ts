import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS } from '../../audit/domain/audit-entry';
import { isFamilyAlreadyRevoked, type SessionRevokedReason } from '../domain/security-policy';

export interface SessionView {
  id: string;
  familyId: string;
  deviceLabel: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  issuedAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Sessions personnelles (`/v1/me/security/sessions`).
 *
 * `refresh_tokens` est une table GLOBALE (aucun `organization_id`) : toute
 * lecture/écriture s'y fait directement via `PrismaService`, jamais sous
 * `withTenant`. L'audit d'une révocation exige pourtant une organisation
 * (`audit_logs.organization_id NOT NULL`) — voir `recordIfPossible`, même
 * repli que `OtpAuthService.recordOtpLock`.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly directory: TenantDirectoryService,
    private readonly config: AppConfigService,
  ) {}

  get accessTokenGraceSeconds(): number {
    return this.config.get('SECURITY_ACCESS_TOKEN_GRACE_SECONDS');
  }

  /** `currentFamilyId` est le `sid` (family_id) porté par le jeton d'accès présenté. */
  async list(userId: string, currentFamilyId: string | null): Promise<SessionView[]> {
    const now = new Date();
    const rows = await this.prisma.refresh_tokens.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: now } },
      orderBy: { issued_at: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      familyId: row.family_id,
      deviceLabel: row.device_label,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      issuedAt: row.issued_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      isCurrent: currentFamilyId !== null && row.family_id === currentFamilyId,
    }));
  }

  /**
   * Révoque toute la famille du jeton `sessionId`. Idempotent : une famille
   * déjà révoquée renvoie sans erreur (contrat, § Centre de sécurité).
   */
  async revoke(userId: string, sessionId: string): Promise<void> {
    const row = await this.prisma.refresh_tokens.findFirst({
      where: { id: sessionId, user_id: userId },
      select: { family_id: true, revoked_at: true },
    });
    if (!row) throw new DomainError('SECURITY.SESSION_NOT_FOUND', { id: sessionId });
    if (isFamilyAlreadyRevoked(row.revoked_at)) return;

    await this.revokeFamily(row.family_id, 'USER_REVOKED');
    await this.recordIfPossible(userId, AUDIT_OPERATIONS.SESSION_REVOKED, {
      sessionId,
      familyId: row.family_id,
      reason: 'USER_REVOKED',
    });
  }

  /** Révocation globale personnelle : toutes les familles, tous appareils, toutes organisations. */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: 'USER_REVOKED' },
    });
    await this.recordIfPossible(userId, AUDIT_OPERATIONS.SESSIONS_REVOKED_ALL, {
      revokedSessions: result.count,
      reason: 'USER_REVOKED',
    });
    return result.count;
  }

  /** Révoque toutes les familles des utilisateurs donnés — appelé par `OrgRevokeAllService`. */
  async revokeAllForUsers(userIds: string[], reason: SessionRevokedReason): Promise<number> {
    if (userIds.length === 0) return 0;
    const result = await this.prisma.refresh_tokens.updateMany({
      where: { user_id: { in: userIds }, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: reason },
    });
    return result.count;
  }

  private async revokeFamily(familyId: string, reason: SessionRevokedReason): Promise<void> {
    await this.prisma.refresh_tokens.updateMany({
      where: { family_id: familyId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: reason },
    });
  }

  private async recordIfPossible(
    userId: string,
    operation: string,
    newState: Record<string, unknown>,
  ): Promise<void> {
    const organizationId = await this.directory.findPrimaryOrganizationId(userId);
    if (!organizationId) return;
    await this.audit.tryRecordStandalone({
      organizationId,
      action: 'STATE_TRANSITION',
      operation,
      entityType: 'refresh_tokens',
      entityId: userId,
      actorUserId: userId,
      newState,
    });
  }
}
