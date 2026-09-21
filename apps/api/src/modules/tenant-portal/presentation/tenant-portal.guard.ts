import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  TenantDirectoryService,
  type TenantLeaseRow,
} from '../../../shared/prisma/tenant-directory.service';
import { TENANT_PORTAL_KEY } from './tenant-portal.decorator';

/**
 * Garde du portail locataire, calquée trait pour trait sur
 * `LandlordPortalGuard` (`modules/landlord-portal/presentation/landlord-portal.guard.ts`,
 * phase 7) : SANS en-tête `X-Organization-Id`, le compte du portail
 * (`tenants.user_id`) n'appartenant à AUCUNE organisation.
 * `OrganizationGuard`/`@Roles(...)`/`@RequireOrganization()` exigent tous une
 * adhésion `organization_members` et ne peuvent donc pas protéger ces routes.
 *
 * Ordre des gardes (`app.module.ts`, tableau `providers` des `APP_GUARD`) :
 * `JwtAuthGuard` est déclaré AVANT `OrganizationGuard`, et Nest exécute les
 * `APP_GUARD` globaux dans leur ordre de déclaration. `TenantPortalGuard` est
 * enregistrée après ces deux-là dans `TenantPortalModule` (portée module,
 * appliquée seulement où `@TenantPortal()` est posé) : `request.user` est
 * donc TOUJOURS déjà renseigné par `JwtAuthGuard` quand cette garde
 * s'exécute — sinon l'authentification aurait déjà échoué en 401 avant
 * d'atteindre ce point.
 *
 * Le rôle dérivé `TENANT_PORTAL` n'est jamais lu depuis le jeton d'accès
 * (`AccessTokenPayload` ne porte que `{sub, sid, typ}` — le MÊME jeton
 * générique que `/v1/auth/otp/verify` et que `/v1/tenant-auth/otp/verify`,
 * c'est cette garde, pas le jeton, qui distingue un accès portail) : il est
 * résolu à CHAQUE requête par lecture base (`listActiveTenantLeases`),
 * exactement comme `OrganizationGuard.resolveMembership` relit l'adhésion à
 * chaque requête plutôt que de faire confiance à un rôle encodé dans le
 * jeton. Le périmètre posé sur `request.tenantLeases` est l'ensemble des
 * baux actifs du locataire (arbitrage n°4 du contrat phase 10) : toute
 * lecture hors de cet ensemble répond 404 dans les contrôleurs applicatifs,
 * jamais ici (cette garde ne connaît aucun identifiant de route).
 */
@Injectable()
export class TenantPortalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly directory: TenantDirectoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const requiresPortal = this.reflector.getAllAndOverride<boolean>(TENANT_PORTAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresPortal) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; tenantLeases?: TenantLeaseRow[] }>();

    if (!request.user) {
      throw new DomainError('IAM.UNAUTHENTICATED');
    }

    const leases = await this.directory.listActiveTenantLeases(request.user.userId);
    if (leases.length === 0) {
      // Aucun bail actif pour ce compte : pas de rôle TENANT_PORTAL.
      throw new DomainError('PARTIES.PORTAL_NO_ACTIVE_LEASE');
    }

    request.tenantLeases = leases;
    return true;
  }
}
