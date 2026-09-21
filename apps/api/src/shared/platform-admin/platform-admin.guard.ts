import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.contracts';
import { DomainError } from '../errors/domain-error';
import { TenantDirectoryService } from '../prisma/tenant-directory.service';
import { PLATFORM_ADMIN_KEY } from './platform-admin.decorator';

/**
 * Garde des routes `/v1/admin/*` (« OWNER plateforme » du contrat phase 10).
 *
 * Calquée sur `LandlordPortalGuard`/`TenantPortalGuard` : le compte qui
 * appelle est un `users` ordinaire (authentifié par le même jeton d'accès
 * générique que le reste de l'API — `JwtAuthGuard`, déclaré en `APP_GUARD`
 * AVANT cette garde), et l'habilitation n'est JAMAIS lue depuis le jeton. Elle
 * est relue en base à chaque requête (`users.is_platform_admin`, extension
 * phase 10 sans équivalent dans le contrat DDL — voir migration
 * `3_platform_admin`), exactement comme `OrganizationGuard.resolveMembership`
 * relit l'adhésion à chaque requête plutôt que de faire confiance à un rôle
 * encodé dans le jeton.
 *
 * Enregistrée dans les modules qui exposent des routes `/v1/admin/*`
 * (`SubscriptionsModule`, `ReferralModule`) et appliquée par `@UseGuards`,
 * jamais en `APP_GUARD` global : elle ne doit protéger que ces routes.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly directory: TenantDirectoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const requiresPlatformAdmin = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresPlatformAdmin) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new DomainError('IAM.UNAUTHENTICATED');
    }

    const isPlatformAdmin = await this.directory.isPlatformAdmin(request.user.userId);
    if (!isPlatformAdmin) {
      // Ressource plateforme, jamais énumérable : même refus qu'un rôle
      // d'organisation insuffisant (403 IAM.FORBIDDEN), pas un 404 — il n'y
      // a ici aucun périmètre à dissimuler, contrairement au cloisonnement
      // inter-organisations du portail locataire.
      throw new DomainError('IAM.FORBIDDEN', { requiredRole: 'PLATFORM_ADMIN' });
    }

    return true;
  }
}
