import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { NIL_UUID, PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { AuditService } from '../../audit/application/audit.service';
import { FeatureFlagsService } from '../../organizations/application/feature-flags.service';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { OtpAuthService, type OtpRequestResult } from '../../identity/application/otp-auth.service';
import type { DeviceInfo } from '../../identity/application/session.service';

/** Drapeau de fonctionnalité (contrat, § « Activation progressive »). */
const TENANT_PORTAL_FLAG_KEY = 'TENANT_PORTAL';

export interface TenantOtpRequestOutcome {
  expiresAt: string;
  resendAfter: number;
}

export interface TenantAuthTenantSummary {
  id: string;
  displayName: string;
  leaseCount: number;
}

export interface TenantOtpVerifyOutcome {
  accessToken: string;
  tenant: TenantAuthTenantSummary;
}

/**
 * Connexion du portail locataire : `otp_purpose = 'LOGIN'` (aucun motif
 * propre au locataire), en réutilisant intégralement `OtpAuthService`
 * (génération/vérification du code — jamais réimplémenté), sur le modèle
 * exact de `LandlordPortalActivationService` (phase 7).
 *
 * Différence assumée avec le portail bailleur : un locataire n'est jamais
 * « en attente d'invitation ». La seule condition d'accès est l'existence
 * d'une fiche `tenants` pour ce numéro portant AU MOINS UN BAIL ACTIF
 * (`TenantDirectoryService.findTenantsWithActiveLeaseByPhone`) — sans quoi
 * la demande est refusée AVANT tout envoi, avec le même code que
 * `TenantPortalGuard` applique après authentification
 * (`PARTIES.PORTAL_NO_ACTIVE_LEASE`), pour une seule et même sémantique
 * « ce compte n'ouvre sur aucun bail ».
 */
@Injectable()
export class TenantAuthService {
  constructor(
    private readonly otp: OtpAuthService,
    private readonly directory: TenantDirectoryService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async requestOtp(
    rawPhone: string,
    channel: 'SMS' | 'WHATSAPP',
    ip: string | null,
  ): Promise<TenantOtpRequestOutcome> {
    const phone = normalizePhoneE164(rawPhone);
    const matches = await this.directory.findTenantsWithActiveLeaseByPhone(phone);
    if (matches.length === 0) {
      throw new DomainError('PARTIES.PORTAL_NO_ACTIVE_LEASE');
    }
    await this.assertPortalEnabled(matches);

    const result = await this.otp.requestOtp(phone, channel, ip);
    return toRequestOutcome(result);
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
    device: DeviceInfo,
  ): Promise<TenantOtpVerifyOutcome> {
    const phone = normalizePhoneE164(rawPhone);
    const matches = await this.directory.findTenantsWithActiveLeaseByPhone(phone);
    if (matches.length === 0) {
      throw new DomainError('PARTIES.PORTAL_NO_ACTIVE_LEASE');
    }
    await this.assertPortalEnabled(matches);

    const session = await this.otp.verifyOtp(phone, code, device);

    for (const match of matches) {
      if (match.userId) continue; // Déjà lié à un compte (reconnexion) : rien à faire.
      await this.prisma.withTenant(match.organizationId, session.userId, async (tx) => {
        await tx.tenants.update({
          where: { id: match.tenantId },
          data: { user_id: session.userId },
        });
        await this.audit.record(tx, {
          organizationId: match.organizationId,
          actorUserId: session.userId,
          action: 'STATE_TRANSITION',
          operation: 'TENANT_PORTAL_ACTIVATED',
          entityType: 'tenants',
          entityId: match.tenantId,
          previousState: { user_id: null },
          newState: { user_id: session.userId },
        });
      });
    }

    const leases = await this.directory.listActiveTenantLeases(session.userId);
    const primary = matches[0];
    const party = await this.prisma.withTenant(primary.organizationId, session.userId, (tx) =>
      tx.tenants.findUniqueOrThrow({
        where: { id: primary.tenantId },
        select: { party_type: true, first_name: true, last_name: true, company_name: true },
      }),
    );

    return {
      accessToken: session.accessToken,
      tenant: {
        id: primary.tenantId,
        displayName: displayNameOf({
          partyType: party.party_type as PartyType,
          firstName: party.first_name,
          lastName: party.last_name,
          companyName: party.company_name,
        }),
        leaseCount: leases.length,
      },
    };
  }

  /**
   * Vrai dès qu'UNE des organisations concernées a activé le drapeau
   * `TENANT_PORTAL` (`feature_flags`, global ou propre au tenant — voir
   * `FeatureFlagsService`). Lu sans utilisateur réel (`NIL_UUID`, « aucun
   * utilisateur » — voir `PrismaService.withTenant`) : la question se pose
   * avant authentification, exactement comme pour l'existence même du
   * compte.
   */
  private async assertPortalEnabled(
    matches: ReadonlyArray<{ organizationId: string }>,
  ): Promise<void> {
    const organizationIds = [...new Set(matches.map((m) => m.organizationId))];
    for (const organizationId of organizationIds) {
      const flags = await this.featureFlags.listForOrganization(organizationId, NIL_UUID);
      if (flags[TENANT_PORTAL_FLAG_KEY]) return;
    }
    throw new DomainError('PARTIES.PORTAL_NOT_ENABLED');
  }
}

function toRequestOutcome(result: OtpRequestResult): TenantOtpRequestOutcome {
  const expiresAt = new Date(Date.now() + result.expiresInSeconds * 1000).toISOString();
  return { expiresAt, resendAfter: result.resendAfterSeconds };
}
