import { AppConfigService } from '../../../shared/config/config.module';
import type { TenantClient } from '../../../shared/prisma/prisma.service';
import { readPrivacySettings, type PrivacySettings } from '../domain/privacy-settings';

/**
 * Valeurs par défaut de `PrivacySettings`, issues de `AppConfigService`
 * (`PRIVACY_RETENTION_*`, `PRIVACY_LEGAL_VERSION`, `PRIVACY_DPO_CONTACT`).
 * Partagé par `ErasureService`, `PrivacySettingsService` et
 * `ProcessingRegisterService` : la même lecture de configuration ne doit pas
 * être recopiée trois fois.
 */
export function defaultPrivacySettings(config: AppConfigService): PrivacySettings {
  return {
    identityMonths: config.get('PRIVACY_RETENTION_IDENTITY_MONTHS'),
    messageLogsDays: config.get('PRIVACY_RETENTION_MESSAGE_LOGS_DAYS'),
    notificationsDays: config.get('PRIVACY_RETENTION_NOTIFICATIONS_DAYS'),
    auditLogsMonths: config.get('PRIVACY_RETENTION_AUDIT_MONTHS'),
    financialYears: config.get('PRIVACY_RETENTION_FINANCIAL_YEARS'),
    dpoName: null,
    dpoContact: config.get('PRIVACY_DPO_CONTACT') ?? null,
    legalVersion: config.get('PRIVACY_LEGAL_VERSION'),
  };
}

/** `PrivacySettings` propres à l'organisation, avec repli sur la configuration si jamais posées. */
export async function privacySettingsFor(
  tx: TenantClient,
  organizationId: string,
  config: AppConfigService,
): Promise<PrivacySettings> {
  const settings = await tx.organization_settings.findUnique({
    where: { organization_id: organizationId },
    select: { settings_json: true },
  });
  return readPrivacySettings(settings?.settings_json, defaultPrivacySettings(config));
}
