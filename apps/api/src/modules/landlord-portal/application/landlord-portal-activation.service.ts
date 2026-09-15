import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS } from '../../audit/domain/audit-entry';
import { OtpAuthService, type OtpRequestResult } from '../../identity/application/otp-auth.service';
import type { DeviceInfo, IssuedSession } from '../../identity/application/session.service';
import type { NotificationChannel } from '../../notifications/domain/ports';

/**
 * Activation du portail bailleur : réutilise intégralement `OtpAuthService`
 * (génération/vérification du code, limitation de débit, repli WhatsApp→SMS
 * — voir `identity/application/otp-auth.service.ts`, NE PAS réimplémenter).
 * Le seul travail propre à ce service : vérifier qu'une invitation existe
 * avant la demande, puis lier TOUTES les fiches bailleur en attente pour ce
 * numéro au compte authentifié après vérification.
 */
@Injectable()
export class LandlordPortalActivationService {
  constructor(
    private readonly otp: OtpAuthService,
    private readonly directory: TenantDirectoryService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Le portail n'est pas un point d'entrée générique d'inscription : sans
   * fiche bailleur en attente pour ce numéro (toutes organisations
   * confondues), la demande est refusée AVANT tout envoi (`AGENCY.PORTAL_NOT_INVITED`,
   * 404 — ne révèle jamais si le numéro existe par ailleurs dans `users`).
   */
  async requestOtp(
    rawPhone: string,
    channel: NotificationChannel,
    ip: string | null,
  ): Promise<OtpRequestResult> {
    const phone = normalizePhoneE164(rawPhone);
    const pending = await this.directory.findPendingLandlordsByPhone(phone);
    if (pending.length === 0) {
      throw new DomainError('AGENCY.PORTAL_NOT_INVITED');
    }
    return this.otp.requestOtp(phone, channel, ip);
  }

  /**
   * Authentifie via l'OTP générique (crée le `users` au besoin), puis lie
   * CHAQUE fiche bailleur en attente pour ce numéro au compte obtenu — un
   * bailleur invité par plusieurs agences est activé partout en une seule
   * vérification. `landlords` est sous RLS : chaque lien est écrit dans son
   * propre `withTenant` (jamais `withGlobal`, réservé aux tables globales).
   * Le jeton retourné est le MÊME jeton d'accès générique que `/v1/auth/otp/verify` :
   * c'est `LandlordPortalGuard`, pas le jeton, qui distingue un accès portail.
   */
  async verifyOtp(rawPhone: string, code: string, device: DeviceInfo): Promise<IssuedSession> {
    const phone = normalizePhoneE164(rawPhone);
    const pending = await this.directory.findPendingLandlordsByPhone(phone);
    const session = await this.otp.verifyOtp(phone, code, device);

    for (const link of pending) {
      await this.prisma.withTenant(link.organizationId, session.userId, async (tx) => {
        await tx.landlords.update({
          where: { id: link.landlordId },
          data: { user_id: session.userId },
        });
        await this.audit.record(tx, {
          organizationId: link.organizationId,
          actorUserId: session.userId,
          action: 'STATE_TRANSITION',
          operation: AUDIT_OPERATIONS.LANDLORD_PORTAL_ACTIVATED,
          entityType: 'landlords',
          entityId: link.landlordId,
          previousState: { user_id: null },
          newState: { user_id: session.userId },
        });
      });
    }

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresInSeconds: session.expiresInSeconds,
    };
  }
}
