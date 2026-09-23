/**
 * `organization_settings.settings_json.privacy` (contrat phase 11, § « Rétention
 * et purge », et arbitrage 13) : sous-objet de plus, sur le modèle déjà
 * employé par `contractTemplate` (phase 2), `paymentMethods` (phase 4),
 * `reconciliation` (phase 6) et `facilities` (phase 8). Domaine pur : lecture
 * tolérante, fusion non destructive des autres clés de `settings_json`.
 */
export interface PrivacySettings {
  identityMonths: number;
  messageLogsDays: number;
  notificationsDays: number;
  auditLogsMonths: number;
  financialYears: number;
  dpoName: string | null;
  dpoContact: string | null;
  legalVersion: string;
}

export type PrivacySettingsPatch = Partial<PrivacySettings>;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function strOrNull(value: unknown, fallback: string | null): string | null {
  if (value === null) return null;
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/**
 * Lit `settings_json.privacy`, complétée par les valeurs par défaut issues de
 * la configuration (`PRIVACY_RETENTION_*`, `PRIVACY_LEGAL_VERSION`,
 * `PRIVACY_DPO_CONTACT`) — jamais codées en dur ici, toujours passées par
 * l'appelant (`AppConfigService`, hors du domaine pur).
 */
export function readPrivacySettings(
  settingsJson: unknown,
  defaults: PrivacySettings,
): PrivacySettings {
  const section = asObject(asObject(settingsJson).privacy);
  return {
    identityMonths: int(section.identityMonths, defaults.identityMonths, 1, 600),
    messageLogsDays: int(section.messageLogsDays, defaults.messageLogsDays, 1, 3650),
    notificationsDays: int(section.notificationsDays, defaults.notificationsDays, 1, 3650),
    auditLogsMonths: int(section.auditLogsMonths, defaults.auditLogsMonths, 1, 1200),
    financialYears: int(section.financialYears, defaults.financialYears, 1, 100),
    dpoName: strOrNull(section.dpoName, defaults.dpoName),
    dpoContact: strOrNull(section.dpoContact, defaults.dpoContact),
    legalVersion: str(section.legalVersion, defaults.legalVersion),
  };
}

/**
 * Fusionne un correctif dans `settings_json`, sans jamais effacer les autres
 * clés (gabarit de contrat, paramètres opérationnels...).
 */
export function mergePrivacySettings(
  settingsJson: unknown,
  patch: PrivacySettingsPatch,
  defaults: PrivacySettings,
): Record<string, unknown> {
  const root = { ...asObject(settingsJson) };
  const current = readPrivacySettings(root, defaults);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  root.privacy = { ...current, ...defined };
  return root;
}
