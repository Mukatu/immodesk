import { Module } from '@nestjs/common';
import { LandlordPortalActivationService } from './application/landlord-portal-activation.service';
import { LandlordPortalQueryService } from './application/landlord-portal-query.service';
import { PortalActivationController } from './presentation/portal-activation.controller';
import { PortalController } from './presentation/portal.controller';
import { LandlordPortalGuard } from './presentation/landlord-portal.guard';

/**
 * Module `landlord-portal` (phase 7) : activation par OTP et routes de
 * consultation du compte du portail bailleur (`landlords.user_id`).
 *
 * Non `@Global()` : rien ici n'est consommé par un autre module. Dépend de
 * `IdentityModule` (`OtpAuthService`, `@Global()`), `PrismaModule`
 * (`PrismaService`/`TenantDirectoryService`, `@Global()`), `AuditModule`
 * (`AuditService`, `@Global()`) et `DocumentsModule` (`DocumentsService`,
 * `@Global()`) — tous déjà disponibles partout, aucun import de module
 * requis. `OwnerStatementsModule` (`@Global()`) fournit les types/fonctions
 * de vue réutilisés par pure import TypeScript (`owner-statement-views.ts`),
 * pas par injection : aucun import de module nécessaire non plus.
 *
 * `LandlordPortalGuard` est appliqué directement sur `PortalController`
 * (`@UseGuards`), pas en `APP_GUARD` global : il ne doit protéger QUE les
 * routes du portail, jamais le reste de l'API.
 */
@Module({
  controllers: [PortalActivationController, PortalController],
  providers: [LandlordPortalActivationService, LandlordPortalQueryService, LandlordPortalGuard],
})
export class LandlordPortalModule {}
