import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ADMIN_KEY = 'immodesk:platformAdmin';

/**
 * Marque une route `/v1/admin/*` : `PlatformAdminGuard` la protège en
 * vérifiant le drapeau dérivé `users.is_platform_admin` par lecture base à
 * CHAQUE requête (jamais depuis le jeton), sur le même principe que
 * `@LandlordPortal()`/`LandlordPortalGuard` et `@TenantPortal()`/
 * `TenantPortalGuard`.
 *
 * Ce rôle n'est PAS un rôle d'organisation (`MemberRole`) : un administrateur
 * de la plateforme n'est pas forcément `OWNER` d'une organisation cliente, et
 * réciproquement un `OWNER` ne l'est pas par défaut. D'où un décorateur et
 * une garde séparés de `@Roles(...)`/`OrganizationGuard`, plutôt qu'un rôle
 * `MemberRole` supplémentaire qui n'aurait aucun sens hors organisation.
 */
export const PlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
