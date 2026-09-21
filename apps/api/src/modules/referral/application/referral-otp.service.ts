import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { maskPhone, maskPhoneForDisplay, normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  channelSequence,
  isAccepted,
  orderedParameters,
  toGsm7,
  type DeliveryChannel,
} from '../../notifications/domain/delivery-rules';
import {
  SMS_PROVIDER,
  WHATSAPP_PROVIDER,
  type NotificationChannel,
  type SendResult,
  type SmsProvider,
  type WhatsAppProvider,
} from '../../notifications/domain/ports';
import { systemTemplate } from '../../notifications/domain/template-catalog';
import { MESSAGE_TEMPLATE_CODES } from '../../notifications/domain/template-codes';
import { renderTemplate } from '../../notifications/domain/template-renderer';
import {
  generateOtpCode,
  hashOtpCode,
  otpChannelOrder,
  otpExpiresAt,
  verifyOtp,
} from '../../identity/domain/otp';

/**
 * OTP `SENSITIVE_ACTION` pour la confirmation, par le bailleur, d'un
 * immeuble enregistré par un partenaire (docs/api/phase10-contract.md,
 * § Apport d'affaires ; `referrals_otp_chk`).
 *
 * DÉLIBÉRÉMENT séparé de `identity/application/otp-auth.service.ts` :
 * celui-ci est câblé sur `purpose = 'LOGIN'` et ouvre toujours une session
 * (`SessionService`). Ici, aucune session n'est créée — seule la
 * confirmation compte — d'où cette variante minimale qui réutilise les
 * mêmes fonctions PURES du domaine OTP (`identity/domain/otp.ts`, ne jamais
 * dupliquer la logique de hachage/expiration/anti-brute-force) et le même
 * envoi direct WhatsApp→SMS que `OtpAuthService.sendOtpWithoutTrace` (le
 * bailleur n'a, par construction, encore aucune organisation).
 *
 * RÉUTILISATION ASSUMÉE : `otp_codes.user_id`, qui référence normalement le
 * titulaire du numéro, porte ici l'identifiant du PARTENAIRE demandeur (son
 * propre compte `users`) plutôt que celui du bailleur (encore inconnu) — la
 * seule façon d'attribuer la confirmation au bon partenaire sans ajouter de
 * colonne, `otp_codes` n'ayant aucun champ libre. `otp_codes.id` sert
 * d'identifiant public de la demande, reporté dans l'URL de confirmation.
 */
@Injectable()
export class ReferralOtpService {
  private readonly logger = new Logger(ReferralOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async request(
    requestingUserId: string,
    rawPhone: string,
    channel: NotificationChannel,
  ): Promise<{ id: string; confirmationSentTo: string }> {
    const phone = normalizePhoneE164(rawPhone);
    const now = new Date();
    const policy = {
      codeLength: this.config.OTP_CODE_LENGTH,
      ttlSeconds: this.config.OTP_TTL_SECONDS,
      maxAttempts: this.config.OTP_MAX_ATTEMPTS,
      resendAfterSeconds: this.config.OTP_RESEND_AFTER_SECONDS,
    };

    // Un seul code vivant par numéro pour ce motif à un instant donné.
    await this.prisma.otp_codes.updateMany({
      where: {
        phone_e164: phone,
        purpose: 'SENSITIVE_ACTION',
        consumed_at: null,
        expires_at: { gt: now },
      },
      data: { expires_at: now },
    });

    const code = generateOtpCode(policy.codeLength);
    const id = newId();
    await this.prisma.otp_codes.create({
      data: {
        id,
        user_id: requestingUserId,
        phone_e164: phone,
        purpose: 'SENSITIVE_ACTION',
        delivery: channel === 'WHATSAPP' ? 'WHATSAPP' : 'SMS',
        code_hash: hashOtpCode(code, phone, this.config.OTP_PEPPER),
        attempts: 0,
        max_attempts: policy.maxAttempts,
        expires_at: otpExpiresAt(now, policy),
      },
    });

    const channelOrder = otpChannelOrder(channel === 'SMS' ? 'SMS' : 'WHATSAPP');
    this.sendDirect(phone, channelOrder, {
      code,
      minutes: String(Math.round(policy.ttlSeconds / 60)),
    }).catch((error: Error) =>
      this.logger.error(
        `Envoi OTP apport d'affaires en échec pour ${maskPhone(phone)} : ${error.message}`,
      ),
    );

    return { id, confirmationSentTo: maskPhoneForDisplay(phone) };
  }

  /**
   * Vérifie le code puis consomme la ligne. Renvoie le `user_id` du
   * demandeur (le partenaire) et le numéro confirmé (le bailleur).
   */
  async verify(
    id: string,
    submittedCode: string,
  ): Promise<{ partnerUserId: string; phone: string }> {
    const record = await this.prisma.otp_codes.findUnique({ where: { id } });
    if (!record || record.purpose !== 'SENSITIVE_ACTION' || !record.user_id) {
      throw new DomainError('IAM.OTP_NOT_FOUND');
    }

    const now = new Date();
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
          record.phone_e164,
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
          remainingAttempts: record.max_attempts - verdict.attemptsAfter,
        });
      case 'LOCKED':
        await this.prisma.otp_codes.update({
          where: { id: record.id },
          data: { attempts: verdict.attemptsAfter, expires_at: now },
        });
        throw new DomainError('IAM.OTP_LOCKED');
      case 'VALID':
        break;
    }

    const consumed = await this.prisma.otp_codes.updateMany({
      where: { id: record.id, consumed_at: null },
      data: { consumed_at: now },
    });
    if (consumed.count === 0) {
      throw new DomainError('IAM.OTP_INVALID');
    }

    return { partnerUserId: record.user_id, phone: record.phone_e164 };
  }

  /** Envoi direct WhatsApp→SMS, sans organisation de rattachement connue. */
  private async sendDirect(
    phone: string,
    channelOrder: DeliveryChannel[],
    variables: Record<string, string>,
  ): Promise<void> {
    for (const channel of channelSequence(channelOrder)) {
      const template = systemTemplate(MESSAGE_TEMPLATE_CODES.OTP_CODE, channel);
      if (!template) continue;
      const body = renderTemplate(template.body, variables);
      let result: SendResult;
      try {
        result =
          channel === 'WHATSAPP'
            ? await this.whatsapp.sendTemplate({
                to: phone,
                templateName: template.providerTemplateName ?? 'otp_code_fr',
                language: template.providerTemplateLang ?? 'fr',
                bodyParameters: orderedParameters(variables, template.variables),
                document: null,
                previewText: body,
                authentication: true,
              })
            : await this.sms.send({
                to: phone,
                body: toGsm7(body),
                templateCode: MESSAGE_TEMPLATE_CODES.OTP_CODE,
              });
      } catch (error) {
        result = {
          providerMessageId: null,
          provider: channel === 'WHATSAPP' ? this.whatsapp.name : this.sms.name,
          segments: 1,
          costAmount: 0n,
          status: 'FAILED',
          errorCode: 'PROVIDER_ERROR',
          errorMessage: (error as Error).message,
        };
      }
      if (isAccepted(result.status)) return;
    }
    this.logger.warn(
      `OTP apport d'affaires non remis pour ${maskPhone(phone)} (tous canaux en échec).`,
    );
  }
}
