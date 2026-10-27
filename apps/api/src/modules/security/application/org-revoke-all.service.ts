import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS } from '../../audit/domain/audit-entry';
import { verifyOtp } from '../../identity/domain/otp';
import { ApiKeysService } from './api-keys.service';
import { SessionsService } from './sessions.service';

export interface OrgRevokeAllResult {
  revokedSessions: number;
  revokedApiKeys: number;
  affectedMembers: number;
  accessTokenGraceSeconds: number;
}

/**
 * Révocation globale d'organisation (`POST /v1/organizations/{id}/security/revoke-all`),
 * gardée par un code OTP à usage unique de motif `SENSITIVE_ACTION` (arbitrage
 * 11 du contrat).
 *
 * TRANCHÉ : le contrat impose l'en-tête `X-Otp-Code` mais n'ouvre AUCUNE
 * route pour DEMANDER ce code (à la différence de l'apport d'affaires,
 * `referral/application/referral-otp.service.ts`, qui a sa propre route de
 * demande) — et cette route n'est pas dans la liste « routes à livrer » de
 * ce chantier. On vérifie donc ici un code OTP `SENSITIVE_ACTION` déjà
 * existant pour le téléphone de l'appelant, sans le générer : le mécanisme de
 * demande devra être branché ailleurs (probablement une route générique
 * `/v1/auth/otp/request?purpose=` non encore livrée) — SIGNALÉ dans le compte
 * rendu de livraison.
 */
@Injectable()
export class OrgRevokeAllService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly apiKeys: ApiKeysService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async revokeAll(
    organizationId: string,
    userId: string,
    otpCode: string | undefined,
  ): Promise<OrgRevokeAllResult> {
    if (this.config.get('SECURITY_REVOKE_ALL_REQUIRES_OTP')) {
      await this.assertOtpValid(userId, otpCode);
    }

    const members = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organization_members.findMany({
        where: { organization_id: organizationId, status: 'ACTIVE' },
        select: { user_id: true },
      }),
    );
    const userIds = members.map((m) => m.user_id);

    const revokedSessions = await this.sessions.revokeAllForUsers(userIds, 'ORG_REVOKE_ALL');
    const revokedApiKeys = await this.prisma.withTenant(organizationId, userId, (tx) =>
      this.apiKeys.revokeAllForOrganization(tx, organizationId),
    );
    await this.prisma.withTenant(organizationId, userId, (tx) =>
      audit(this.auditService, tx, {
        action: 'STATE_TRANSITION',
        operation: AUDIT_OPERATIONS.ORGANIZATION_ACCESS_REVOKED,
        entityType: 'organizations',
        entityId: organizationId,
        newState: { revokedSessions, revokedApiKeys, affectedMembers: userIds.length },
      }),
    );

    return {
      revokedSessions,
      revokedApiKeys,
      affectedMembers: userIds.length,
      accessTokenGraceSeconds: this.config.get('SECURITY_ACCESS_TOKEN_GRACE_SECONDS'),
    };
  }

  /**
   * Toute issue autre que VALID retombe sur le seul code documenté par le
   * contrat pour cette route, `403 SECURITY.SENSITIVE_ACTION_OTP_REQUIRED`
   * (pas de distinction OTP_EXPIRED/OTP_LOCKED ici, contrairement au flux de
   * connexion).
   */
  private async assertOtpValid(userId: string, submittedCode: string | undefined): Promise<void> {
    const user = submittedCode
      ? await this.prisma.users.findUnique({ where: { id: userId }, select: { phone_e164: true } })
      : null;
    const record = user
      ? await this.prisma.otp_codes.findFirst({
          where: { phone_e164: user.phone_e164, purpose: 'SENSITIVE_ACTION' },
          orderBy: { created_at: 'desc' },
        })
      : null;
    if (!submittedCode || !user || !record) {
      throw new DomainError('SECURITY.SENSITIVE_ACTION_OTP_REQUIRED');
    }

    const now = new Date();
    const verdict = verifyOtp(
      {
        codeHash: record.code_hash,
        attempts: record.attempts,
        maxAttempts: record.max_attempts,
        expiresAt: record.expires_at,
        consumedAt: record.consumed_at,
      },
      submittedCode,
      user.phone_e164,
      this.config.get('OTP_PEPPER'),
      now,
    );

    if (verdict.outcome === 'INVALID' || verdict.outcome === 'LOCKED') {
      await this.prisma.otp_codes.update({
        where: { id: record.id },
        data: {
          attempts: verdict.attemptsAfter,
          ...(verdict.outcome === 'LOCKED' ? { expires_at: now } : {}),
        },
      });
    }
    if (verdict.outcome !== 'VALID') {
      throw new DomainError('SECURITY.SENSITIVE_ACTION_OTP_REQUIRED');
    }
    await this.prisma.otp_codes.updateMany({
      where: { id: record.id, consumed_at: null },
      data: { consumed_at: now },
    });
  }
}
