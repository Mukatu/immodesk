import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import {
  decideRotation,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
} from '../domain/refresh-token';
import { JwtTokenService } from '../infrastructure/jwt-token.service';

export interface DeviceInfo {
  deviceName?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

/**
 * Cycle de vie des sessions : émission, rotation et révocation des refresh
 * tokens. `refresh_tokens` est une table GLOBALE (aucun `organization_id`),
 * l'autorisation y est purement applicative.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtTokenService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Ouvre une nouvelle session (nouvelle famille de jetons). */
  async issue(userId: string, device: DeviceInfo, tx?: TenantClient): Promise<IssuedSession> {
    const familyId = newId();
    return this.issueInFamily(userId, familyId, null, device, tx);
  }

  /**
   * Rotation : révoque le jeton présenté et en émet un nouveau dans la même
   * famille. Le rejeu d'un jeton déjà révoqué révoque toute la famille.
   */
  async rotate(presentedToken: string, device: DeviceInfo): Promise<IssuedSession> {
    const tokenHash = hashRefreshToken(presentedToken);
    const now = new Date();

    const stored = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        user_id: true,
        family_id: true,
        expires_at: true,
        revoked_at: true,
      },
    });

    const verdict = decideRotation(
      stored
        ? {
            id: stored.id,
            userId: stored.user_id,
            familyId: stored.family_id,
            expiresAt: stored.expires_at,
            revokedAt: stored.revoked_at,
          }
        : null,
      now,
    );

    switch (verdict.outcome) {
      case 'NOT_FOUND':
        throw new DomainError('IAM.REFRESH_INVALID');

      case 'REUSE_DETECTED':
        // Vol de session présumé : l'appareil entier est déconnecté.
        // La révocation est validée AVANT de lever l'erreur — si elle était
        // faite dans la transaction que le `throw` annule, la famille
        // resterait utilisable et le vol de session sans conséquence.
        await this.revokeFamily(this.prisma, verdict.familyId, 'REUSE_DETECTED');
        throw new DomainError('IAM.REFRESH_REVOKED', { familyId: verdict.familyId });

      case 'EXPIRED':
        await this.revokeFamily(this.prisma, verdict.familyId, 'EXPIRED');
        throw new DomainError('IAM.REFRESH_EXPIRED');

      case 'ROTATE': {
        const record = stored as NonNullable<typeof stored>;
        return this.prisma.withGlobal(async (tx) => {
          // La révocation de l'ancien jeton est conditionnée à son état :
          // deux rotations concurrentes ne peuvent pas émettre deux jetons.
          const revoked = await tx.refresh_tokens.updateMany({
            where: { id: record.id, revoked_at: null },
            data: { revoked_at: now, revoked_reason: 'ROTATED' },
          });
          if (revoked.count === 0) {
            throw new DomainError('IAM.REFRESH_REVOKED', { familyId: record.family_id });
          }
          return this.issueInFamily(record.user_id, record.family_id, record.id, device, tx);
        });
      }
    }
  }

  /** Déconnexion : révoque la famille du jeton présenté. */
  async logout(presentedToken: string, userId: string): Promise<void> {
    const tokenHash = hashRefreshToken(presentedToken);
    await this.prisma.withGlobal(async (tx) => {
      const stored = await tx.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
        select: { id: true, user_id: true, family_id: true },
      });
      // Silencieux si le jeton est inconnu : une déconnexion est idempotente
      // et ne doit pas révéler l'existence d'un jeton.
      if (!stored || stored.user_id !== userId) return;
      await this.revokeFamily(tx, stored.family_id, 'LOGOUT');
    });
  }

  /** Révoque toutes les sessions d'un utilisateur (toutes familles). */
  async revokeAllForUser(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: reason },
    });
    return result.count;
  }

  private async revokeFamily(
    tx: TenantClient | PrismaService,
    familyId: string,
    reason: string,
  ): Promise<void> {
    await tx.refresh_tokens.updateMany({
      where: { family_id: familyId, revoked_at: null },
      data: { revoked_at: new Date(), revoked_reason: reason },
    });
  }

  private async issueInFamily(
    userId: string,
    familyId: string,
    parentTokenId: string | null,
    device: DeviceInfo,
    tx?: TenantClient,
  ): Promise<IssuedSession> {
    const client = tx ?? this.prisma;
    const refreshToken = generateRefreshToken();
    const now = new Date();

    await client.refresh_tokens.create({
      data: {
        id: newId(),
        user_id: userId,
        token_hash: hashRefreshToken(refreshToken),
        family_id: familyId,
        parent_token_id: parentTokenId,
        device_label: device.deviceName ?? null,
        user_agent: device.userAgent ?? null,
        ip_address: device.ipAddress ?? null,
        issued_at: now,
        expires_at: refreshExpiresAt(now, this.config.REFRESH_TOKEN_TTL_DAYS),
      },
    });

    const accessToken = await this.jwt.signAccessToken(userId, familyId);
    return {
      accessToken,
      refreshToken,
      expiresInSeconds: this.config.JWT_ACCESS_TTL_SECONDS,
    };
  }
}
