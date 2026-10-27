import { Module } from '@nestjs/common';
import { AccessDenialsService } from './application/access-denials.service';
import { ApiKeysService } from './application/api-keys.service';
import { AuditLogsService } from './application/audit-logs.service';
import { OrgRevokeAllService } from './application/org-revoke-all.service';
import { SecurityCenterService } from './application/security-center.service';
import { SessionsService } from './application/sessions.service';
import { AuditLogsController } from './presentation/audit-logs.controller';
import { SecurityController } from './presentation/security.controller';
import { SensitiveActionOtpController } from './presentation/sensitive-action-otp.controller';
import { SessionsController } from './presentation/sessions.controller';

/**
 * Module `security` : centre de sécurité (contrat phase 11, § 11.A) —
 * sessions personnelles, clés d'API, révocation globale d'organisation,
 * journal des accès refusés et consultation de l'audit.
 *
 * AUCUNE table propre (contrainte du contrat) : s'appuie sur `refresh_tokens`
 * (sessions), `api_keys`, `audit_logs` (refus d'accès et journal d'audit) et
 * le drapeau global `read_only_mode` de `feature_flags`, toutes déjà
 * possédées par d'autres modules (`identity`, `audit`, `platform`) mais
 * lues ici directement via `PrismaService`, comme le reste du dépôt le fait
 * déjà pour des lectures transverses en lecture seule.
 *
 * `PrismaService`, `AuditService`, `AppConfigService` et `TenantDirectoryService`
 * viennent de modules `@Global()` (`PrismaModule`, `AuditModule`,
 * `AppConfigModule`) : aucun `imports` n'est nécessaire ici.
 *
 * À CÂBLER (hors périmètre de ce module — `app.module.ts` est interdit
 * d'écriture ici) : ajouter `SecurityModule` aux imports de `AppModule`.
 */
@Module({
  controllers: [
    SessionsController,
    SensitiveActionOtpController,
    SecurityController,
    AuditLogsController,
  ],
  providers: [
    SessionsService,
    ApiKeysService,
    SecurityCenterService,
    OrgRevokeAllService,
    AccessDenialsService,
    AuditLogsService,
  ],
})
export class SecurityModule {}
