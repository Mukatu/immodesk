import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  mergePrivacySettings,
  readPrivacySettings,
  type PrivacySettings,
  type PrivacySettingsPatch,
} from '../domain/privacy-settings';
import { defaultPrivacySettings } from './privacy-defaults';

/**
 * `GET`/`PATCH /v1/organizations/{id}/privacy-settings` : sous-objet
 * `organization_settings.settings_json.privacy` (arbitrage 13), sur le même
 * modèle que `OrganizationsService.getSettings`/`updateSettings` (module
 * `organizations`, hors périmètre de cet agent) — mais tenu ICI pour ne
 * modifier aucun fichier hors de `modules/privacy`.
 */
@Injectable()
export class PrivacySettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  private defaults(): PrivacySettings {
    return defaultPrivacySettings(this.config);
  }

  async get(organizationId: string, userId: string): Promise<PrivacySettings> {
    const row = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { settings_json: true },
      }),
    );
    if (!row) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });
    return readPrivacySettings(row.settings_json, this.defaults());
  }

  async update(
    organizationId: string,
    userId: string,
    patch: PrivacySettingsPatch,
  ): Promise<PrivacySettings> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      if (!before) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });

      const defaults = this.defaults();
      const beforeView = readPrivacySettings(before.settings_json, defaults);
      const merged = mergePrivacySettings(before.settings_json, patch, defaults);

      const after = await tx.organization_settings.update({
        where: { organization_id: organizationId },
        data: { settings_json: merged as object, updated_at: new Date() },
        select: { settings_json: true },
      });
      const afterView = readPrivacySettings(after.settings_json, defaults);

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.PRIVACY_SETTINGS_UPDATED,
        entityType: 'organization_settings',
        entityId: organizationId,
        previousState: toJsonState(beforeView),
        newState: toJsonState(afterView),
      });

      return afterView;
    });
  }
}
