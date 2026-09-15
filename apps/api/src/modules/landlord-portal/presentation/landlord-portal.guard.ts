import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../shared/auth/auth.contracts';
import { DomainError } from '../../../shared/errors/domain-error';
import {
  TenantDirectoryService,
  type LandlordLinkRow,
} from '../../../shared/prisma/tenant-directory.service';
import { LANDLORD_PORTAL_KEY } from './landlord-portal.decorator';

/**
 * Garde du portail bailleur, calquée sur `OrganizationGuard`
 * (`shared/tenant/organization.guard.ts`) mais SANS en-tête
 * `X-Organization-Id` : le compte du portail (`landlords.user_id`) n'appartient
 * à AUCUNE organisation. `OrganizationGuard`/`@Roles(...)`/`@RequireOrganization()`
 * exigent tous une adhésion `organization_members` et ne peuvent donc pas
 * protéger ces routes.
 *
 * Ordre des gardes (`app.module.ts`, tableau `providers` des `APP_GUARD`) :
 * `JwtAuthGuard` est déclaré AVANT `OrganizationGuard`, et Nest exécute les
 * `APP_GUARD` globaux dans leur ordre de déclaration. `LandlordPortalGuard`
 * est enregistré après ces deux-là dans `LandlordPortalModule` (portée
 * module, appliquée seulement où `@LandlordPortal()` est posé) : `request.user`
 * est donc TOUJOURS déjà renseigné par `JwtAuthGuard` quand cette garde
 * s'exécute — sinon l'authentification aurait déjà échoué en 401 avant
 * d'atteindre ce point.
 *
 * Le rôle dérivé `LANDLORD_PORTAL` n'est jamais lu depuis le jeton d'accès
 * (`AccessTokenPayload` ne porte que `{sub, sid, typ}`) : il est résolu à
 * CHAQUE requête par lecture base (`listLandlordLinks`), exactement comme
 * `OrganizationGuard.resolveMembership` relit l'adhésion à chaque requête
 * plutôt que de faire confiance à un rôle encodé dans le jeton.
 */
@Injectable()
export class LandlordPortalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly directory: TenantDirectoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const requiresPortal = this.reflector.getAllAndOverride<boolean>(LANDLORD_PORTAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresPortal) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; landlordLinks?: LandlordLinkRow[] }>();

    if (!request.user) {
      throw new DomainError('IAM.UNAUTHENTICATED');
    }

    const links = await this.directory.listLandlordLinks(request.user.userId);
    if (links.length === 0) {
      // Aucun lien bailleur pour ce compte : pas de rôle LANDLORD_PORTAL.
      throw new DomainError('AGENCY.PORTAL_READ_ONLY');
    }

    request.landlordLinks = links;
    return true;
  }
}
