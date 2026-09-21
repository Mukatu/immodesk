import { Module } from '@nestjs/common';
import { ReferralPartnersService } from './application/referral-partners.service';
import { ReferralProgramsService } from './application/referral-programs.service';
import { ReferralCodeService } from './application/referral-code.service';
import { ReferralOtpService } from './application/referral-otp.service';
import { ReferralPropertyLeadService } from './application/referral-property-lead.service';
import { ReferralQueriesService } from './application/referral-queries.service';
import { ReferralQualificationService } from './application/referral-qualification.service';
import { ReferralCommissionsAdminService } from './application/referral-commissions-admin.service';
import { ReferralPayoutsAdminService } from './application/referral-payouts-admin.service';
import { ReferralAtRiskService } from './application/referral-at-risk.service';
import { ReferralPartnersController } from './presentation/referral-partners.controller';
import { ReferralPropertyConfirmationController } from './presentation/referral-property-confirmation.controller';
import { ReferralCodeController } from './presentation/referral-code.controller';
import { ReferralAdminController } from './presentation/referral-admin.controller';
import { ReferralPartnerGuard } from './presentation/referral-partner.guard';
import { PlatformAdminGuard } from '../../shared/platform-admin/platform-admin.guard';

/**
 * Module `referral` (phase 10) : apport d'affaires / parrainage —
 * docs/api/phase10-contract.md, § Apport d'affaires. Propriétaire exclusif
 * des tables globales `referral_programs`, `referral_partners`, `referrals`,
 * `referral_commissions`, `referral_payouts`.
 *
 * POINT D'INTÉGRATION exposé au module `subscriptions` (squelette au moment
 * de cette écriture) : `ReferralQualificationService.onSubscriptionInvoicePaid(event)`
 * — à appeler juste après qu'une `subscription_invoices` passe réellement à
 * PAID (après re-interrogation de l'agrégateur, jamais sur le seul webhook).
 * Voir la docstring du service pour le contrat exact. `ReferralQualificationService`
 * est donc exporté ici pour être injecté depuis `SubscriptionsModule` une
 * fois prêt (import de `ReferralModule` dans `SubscriptionsModule`, pas
 * l'inverse, pour éviter toute dépendance circulaire).
 *
 * `PlatformAdminGuard` est appliqué par `@UseGuards` sur
 * `ReferralAdminController` (pas en `APP_GUARD` global — voir sa propre
 * docstring), donc déclaré comme provider ici plutôt que réimporté depuis un
 * module `platform-admin` (qui n'existe pas : c'est un simple dossier
 * partagé, pas un `@Module`).
 */
@Module({
  controllers: [
    ReferralPartnersController,
    ReferralPropertyConfirmationController,
    ReferralCodeController,
    ReferralAdminController,
  ],
  providers: [
    ReferralPartnersService,
    ReferralProgramsService,
    ReferralCodeService,
    ReferralOtpService,
    ReferralPropertyLeadService,
    ReferralQueriesService,
    ReferralQualificationService,
    ReferralCommissionsAdminService,
    ReferralPayoutsAdminService,
    ReferralAtRiskService,
    ReferralPartnerGuard,
    PlatformAdminGuard,
  ],
  exports: [ReferralQualificationService],
})
export class ReferralModule {}
