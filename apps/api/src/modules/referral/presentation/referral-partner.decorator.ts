import { SetMetadata } from '@nestjs/common';

export const REFERRAL_PARTNER_KEY = 'immodesk:referralPartner';

/**
 * Marque une route `/v1/referral-partners/me*` : `ReferralPartnerGuard`
 * résout le partenaire à partir de `referral_partners.user_id`, sur le même
 * principe que `@PlatformAdmin()`/`PlatformAdminGuard` et
 * `@LandlordPortal()`/`LandlordPortalGuard` — un rôle DÉRIVÉ, jamais un rôle
 * `MemberRole` d'organisation (le partenaire n'est membre d'aucune
 * organisation cliente du seul fait d'être partenaire).
 */
export const ReferralPartner = () => SetMetadata(REFERRAL_PARTNER_KEY, true);
