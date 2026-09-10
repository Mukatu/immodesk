import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { maskPhone, normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS } from '../../audit/domain/audit-entry';
import {
  NotificationsService,
  TEMPLATE_CODES,
} from '../../notifications/application/notifications.service';
import type { NotificationChannel } from '../../notifications/domain/ports';
import {
  generateOtpCode,
  hashOtpCode,
  otpExpiresAt,
  resendCooldownRemaining,
  verifyOtp,
  type OtpPolicy,
} from '../domain/otp';
import { SessionService, type DeviceInfo, type IssuedSession } from './session.service';

export interface OtpRequestResult {
  requestId: string;
  channel: NotificationChannel;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface OtpVerifyResult extends IssuedSession {
  userId: string;
  isNewUser: boolean;
}

@Injectable()
export class OtpAuthService {
  private readonly logger = new Logger(OtpAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly directory: TenantDirectoryService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private get policy(): OtpPolicy {
    return {
      codeLength: this.config.OTP_CODE_LENGTH,
      ttlSeconds: this.config.OTP_TTL_SECONDS,
      maxAttempts: this.config.OTP_MAX_ATTEMPTS,
      resendAfterSeconds: this.config.OTP_RESEND_AFTER_SECONDS,
    };
  }

  /**
   * Demande d'un code de connexion.
   *
   * La réponse est identique que le numéro soit connu ou non : l'API ne doit
   * jamais permettre d'énumérer les comptes existants.
   */
  async requestOtp(
    rawPhone: string,
    channel: NotificationChannel,
    ip: string | null,
  ): Promise<OtpRequestResult> {
    const phone = normalizePhoneE164(rawPhone);
    const policy = this.policy;
    const now = new Date();

    // Délai plancher entre deux demandes, en complément de la limitation
    // de débit Redis (qui, elle, protège contre le volume).
    const last = await this.prisma.otp_codes.findFirst({
      where: { phone_e164: phone, purpose: 'LOGIN' },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });
    if (last) {
      const remaining = resendCooldownRemaining(last.created_at, now, policy);
      if (remaining > 0) {
        throw new DomainError('IAM.OTP_RESEND_TOO_SOON', { retryAfterSeconds: remaining });
      }
    }

    const code = generateOtpCode(policy.codeLength);
    const requestId = newId();

    // Les demandes antérieures encore actives sont invalidées : un seul code
    // vivant par numéro à un instant donné.
    await this.prisma.otp_codes.updateMany({
      where: { phone_e164: phone, purpose: 'LOGIN', consumed_at: null, expires_at: { gt: now } },
      data: { expires_at: now },
    });

    const user = await this.prisma.users.findUnique({
      where: { phone_e164: phone },
      select: { id: true },
    });

    await this.prisma.otp_codes.create({
      data: {
        id: requestId,
        user_id: user?.id ?? null,
        phone_e164: phone,
        purpose: 'LOGIN',
        delivery: channel === 'WHATSAPP' ? 'WHATSAPP' : 'SMS',
        code_hash: hashOtpCode(code, phone, this.config.OTP_PEPPER),
        attempts: 0,
        max_attempts: policy.maxAttempts,
        expires_at: otpExpiresAt(now, policy),
        request_ip: ip,
      },
    });

    const organizationId = await this.resolveTraceOrganization(user?.id ?? null);
    await this.notifications.sendTemplated({
      organizationId,
      to: phone,
      templateCode: TEMPLATE_CODES.OTP_LOGIN,
      channel,
      variables: { code, minutes: String(Math.round(policy.ttlSeconds / 60)) },
      fallbackBody:
        'Immodesk : votre code de connexion est {{code}}. Il expire dans {{minutes}} minutes. Ne le communiquez à personne.',
      relatedEntityType: 'otp_codes',
      relatedEntityId: requestId,
    });

    this.logger.log(`Code de connexion émis pour ${maskPhone(phone)} (canal ${channel}).`);

    return {
      requestId,
      channel,
      expiresInSeconds: policy.ttlSeconds,
      resendAfterSeconds: policy.resendAfterSeconds,
    };
  }

  /**
   * Vérification du code et ouverture de session.
   * L'utilisateur est créé au premier succès (inscription implicite).
   */
  async verifyOtp(
    rawPhone: string,
    submittedCode: string,
    device: DeviceInfo,
  ): Promise<OtpVerifyResult> {
    const phone = normalizePhoneE164(rawPhone);
    const now = new Date();
    const policy = this.policy;

    const record = await this.prisma.otp_codes.findFirst({
      where: { phone_e164: phone, purpose: 'LOGIN' },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        code_hash: true,
        attempts: true,
        max_attempts: true,
        expires_at: true,
        consumed_at: true,
      },
    });

    if (!record) {
      throw new DomainError('IAM.OTP_NOT_FOUND');
    }

    // Code fixe de développement : jamais actif en production (garanti par
    // `AppConfigService.devOtpCode` et par la validation de configuration).
    const devCode = this.config.NODE_ENV === 'production' ? null : this.config.OTP_DEV_CODE;
    const isDevBypass = devCode !== null && devCode !== undefined && submittedCode === devCode;

    const verdict = isDevBypass
      ? ({ outcome: 'VALID' } as const)
      : verifyOtp(
          {
            codeHash: record.code_hash,
            attempts: record.attempts,
            maxAttempts: record.max_attempts,
            expiresAt: record.expires_at,
            consumedAt: record.consumed_at,
          },
          submittedCode,
          phone,
          this.config.OTP_PEPPER,
          now,
        );

    switch (verdict.outcome) {
      case 'EXPIRED':
        throw new DomainError('IAM.OTP_EXPIRED');

      case 'CONSUMED':
        throw new DomainError('IAM.OTP_INVALID');

      case 'INVALID':
        await this.prisma.otp_codes.update({
          where: { id: record.id },
          data: { attempts: verdict.attemptsAfter },
        });
        throw new DomainError('IAM.OTP_INVALID', {
          remainingAttempts: policy.maxAttempts - verdict.attemptsAfter,
        });

      case 'LOCKED': {
        // Le code est invalidé immédiatement : il ne pourra plus être
        // vérifié, même avec la bonne valeur.
        await this.prisma.otp_codes.update({
          where: { id: record.id },
          data: { attempts: verdict.attemptsAfter, expires_at: now },
        });
        await this.recordOtpLock(phone, record.id, device);
        throw new DomainError('IAM.OTP_LOCKED');
      }

      case 'VALID':
        break;
    }

    // Consommation atomique : la clause `consumed_at: null` empêche deux
    // vérifications concurrentes d'ouvrir deux sessions avec le même code.
    const consumed = await this.prisma.otp_codes.updateMany({
      where: { id: record.id, consumed_at: null },
      data: { consumed_at: now },
    });
    if (consumed.count === 0) {
      throw new DomainError('IAM.OTP_INVALID');
    }

    const { userId, isNewUser } = await this.findOrCreateUser(phone, now);
    const session = await this.sessions.issue(userId, device);
    await this.recordLogin(userId, phone, device);

    return { ...session, userId, isNewUser };
  }

  /** Création implicite du compte au premier succès de vérification. */
  private async findOrCreateUser(
    phone: string,
    now: Date,
  ): Promise<{ userId: string; isNewUser: boolean }> {
    const existing = await this.prisma.users.findUnique({
      where: { phone_e164: phone },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status === 'SUSPENDED' || existing.status === 'DELETED') {
        throw new DomainError('IAM.USER_SUSPENDED');
      }
      await this.prisma.users.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          phone_verified_at: now,
          last_login_at: now,
          updated_at: now,
        },
      });
      return { userId: existing.id, isNewUser: false };
    }

    const created = await this.prisma.users.create({
      data: {
        id: newId(),
        phone_e164: phone,
        phone_verified_at: now,
        status: 'ACTIVE',
        locale: 'fr-CG',
        last_login_at: now,
      },
      select: { id: true },
    });
    return { userId: created.id, isNewUser: true };
  }

  /**
   * `audit_logs.organization_id` est NOT NULL : le verrouillage n'est
   * journalisé que si le numéro correspond à un membre d'au moins une
   * organisation. Sinon, seule la trace applicative subsiste.
   */
  private async recordOtpLock(phone: string, otpId: string, device: DeviceInfo): Promise<void> {
    this.logger.warn(`Code de connexion verrouillé pour ${maskPhone(phone)} (5 échecs).`);

    const user = await this.prisma.users.findUnique({
      where: { phone_e164: phone },
      select: { id: true },
    });
    const organizationId = await this.resolveTraceOrganization(user?.id ?? null);
    if (!organizationId) return;

    await this.audit.tryRecordStandalone({
      organizationId,
      action: 'STATE_TRANSITION',
      operation: AUDIT_OPERATIONS.OTP_LOCKED,
      entityType: 'otp_codes',
      entityId: otpId,
      actorUserId: user?.id ?? null,
      actorLabel: maskPhone(phone),
      previousState: { status: 'ACTIVE' },
      newState: { status: 'LOCKED', reason: 'MAX_ATTEMPTS_REACHED' },
      ipAddress: device.ipAddress ?? null,
      userAgent: device.userAgent ?? null,
    });
  }

  private async recordLogin(userId: string, phone: string, device: DeviceInfo): Promise<void> {
    const organizationId = await this.resolveTraceOrganization(userId);
    if (!organizationId) return;
    await this.audit.tryRecordStandalone({
      organizationId,
      action: 'LOGIN',
      operation: AUDIT_OPERATIONS.OTP_VERIFIED,
      entityType: 'users',
      entityId: userId,
      actorUserId: userId,
      actorLabel: maskPhone(phone),
      newState: { channel: 'OTP', device: device.deviceName ?? null },
      ipAddress: device.ipAddress ?? null,
      userAgent: device.userAgent ?? null,
    });
  }

  /**
   * Organisation de rattachement des traces (`message_logs`, `audit_logs`)
   * pour un utilisateur : sa première adhésion active. `null` si
   * l'utilisateur n'existe pas encore ou n'appartient à aucune organisation.
   */
  private async resolveTraceOrganization(userId: string | null): Promise<string | null> {
    if (!userId) return null;
    return this.directory.findPrimaryOrganizationId(userId);
  }
}
