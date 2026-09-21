import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import type { NotificationChannel } from '../../notifications/domain/ports';
import { ReferralOtpService } from './referral-otp.service';
import { ReferralProgramsService } from './referral-programs.service';
import { isUniqueViolation } from '../../../shared/prisma/sql-errors';
import { toReferralView, type ReferralView } from './referral-queries.service';

/**
 * Enregistrement d'un immeuble par un partenaire, confirmé par OTP du
 * bailleur (docs/api/phase10-contract.md, § Apport d'affaires, source
 * `PARTNER_REGISTERED_PROPERTY`). Aucune ligne `referrals` avant
 * confirmation (`202 { confirmationSentTo }`).
 *
 * HYPOTHÈSE DOCUMENTÉE : le partenaire ne connaît, sur le terrain, que le
 * numéro de téléphone du bailleur — jamais l'identifiant d'une organisation
 * (RLS, aucune route ne les expose à un tiers). La résolution s'appuie donc
 * sur le bailleur « self » (`landlords.is_self`, provisionné automatiquement
 * à la création d'une organisation `INDEPENDENT_LANDLORD`/`INDEPENDENT_MANAGER`,
 * voir `parties/application/self-landlord.provisioner.ts`) : si son
 * `primary_phone` correspond, l'organisation est identifiée SANS jamais être
 * révélée au partenaire avant confirmation (`request()` répond toujours de
 * façon identique, correspondance ou non, pour ne rien laisser deviner).
 * `referred_property_id` reste `null` (colonne facultative) : ce flux ne crée
 * aucun bien, il rattache l'organisation déjà existante du bailleur.
 */
@Injectable()
export class ReferralPropertyLeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: TenantDirectoryService,
    private readonly otp: ReferralOtpService,
    private readonly programs: ReferralProgramsService,
  ) {}

  async request(
    partnerUserId: string,
    landlordPhone: string,
    channel: NotificationChannel,
  ): Promise<{ id: string; confirmationSentTo: string }> {
    return this.otp.request(partnerUserId, landlordPhone, channel);
  }

  async confirm(otpRequestId: string, code: string): Promise<ReferralView> {
    const { partnerUserId, phone } = await this.otp.verify(otpRequestId, code);

    // Le bailleur (appelant public, non authentifié comme partenaire) valide
    // ici pour le compte du partenaire dont l'identité est déjà connue et
    // vérifiée (OTP consommé). `app.current_user_id` est donc positionné sur
    // CE partenaire — jamais sur l'appelant, qui n'en a aucun — pour que la
    // policy RLS `partner_self` (migration `0_init`) autorise la lecture et
    // l'écriture de SA fiche/parrainage, exactement comme s'il agissait
    // lui-même.
    const partner = await this.prisma.withUser(partnerUserId, (tx) =>
      tx.referral_partners.findUnique({ where: { user_id: partnerUserId } }),
    );
    if (!partner) {
      throw new DomainError('REFERRALS.PARTNER_NOT_FOUND');
    }

    const organizationId = await this.directory.findSelfLandlordOrganizationByPhone(phone);
    if (!organizationId) {
      throw new DomainError('REFERRALS.NOT_FOUND', {
        reason: 'Aucune organisation ne correspond à ce numéro de bailleur.',
      });
    }

    if (partner.organization_id === organizationId) {
      throw new DomainError('REFERRALS.SELF_REFERRAL');
    }
    const memberships = await this.directory.listActiveMemberships(partner.user_id);
    if (memberships.some((m) => m.organizationId === organizationId)) {
      throw new DomainError('REFERRALS.SELF_REFERRAL');
    }

    const program = await this.programs.getActiveDefault();
    const now = new Date();

    try {
      const referral = await this.prisma.withUser(partnerUserId, (tx) =>
        tx.referrals.create({
          data: {
            id: newId(),
            partner_id: partner.id,
            referred_organization_id: organizationId,
            program_id: program.id,
            source: 'PARTNER_REGISTERED_PROPERTY',
            status: 'PENDING',
            confirmed_by_otp_at: now,
          },
        }),
      );
      return toReferralView(referral);
    } catch (error) {
      // Aucun hint de colonne ici : à l'intérieur d'une transaction
      // interactive (`withUser`), Prisma peut perdre `meta.target` sur un
      // P2002 (le message devient « Unique constraint failed on the (not
      // available) ») — voir `isUniqueViolation`. Sans ambiguïté possible
      // puisque `referrals` ne porte qu'UNE contrainte d'unicité
      // (`referrals_org_uk`, sur `referred_organization_id`), ce `create()`
      // ne peut violer qu'elle.
      if (isUniqueViolation(error)) {
        throw new DomainError('REFERRALS.ALREADY_REFERRED');
      }
      throw error;
    }
  }
}
