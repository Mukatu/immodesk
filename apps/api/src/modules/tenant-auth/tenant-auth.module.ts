import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TenantAuthService } from './application/tenant-auth.service';
import { TenantAuthController } from './presentation/tenant-auth.controller';

/**
 * Module `tenant-auth` (phase 10, tranche 2) : connexion du portail
 * locataire (`POST /v1/tenant-auth/otp/request` puis `.../verify`), sur le
 * numéro du locataire avec `otp_purpose = 'LOGIN'`. Réutilise intégralement
 * `OtpAuthService` (module `identity`, `@Global()`) et `AuditService`
 * (module `audit`, `@Global()`) — aucun import requis pour ces deux-là.
 *
 * `OrganizationsModule` est importé pour `FeatureFlagsService` (drapeau
 * `TENANT_PORTAL`, arbitrage « Activation progressive » du contrat) : ce
 * module n'est PAS `@Global()`.
 *
 * Séparé de `TenantPortalModule` : ce module porte l'AUTHENTIFICATION
 * (émission du jeton générique), `tenant-portal` porte la GARDE et les
 * routes protégées par le rôle dérivé `TENANT_PORTAL` — même séparation
 * qu'`IdentityModule`/`LandlordPortalModule` en phase 7.
 */
@Module({
  imports: [OrganizationsModule],
  controllers: [TenantAuthController],
  providers: [TenantAuthService],
})
export class TenantAuthModule {}
