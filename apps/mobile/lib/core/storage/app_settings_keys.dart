/// Clés utilisées dans la table locale `app_settings` (clé/valeur).
abstract final class AppSettingsKeys {
  static const String selectedOrganizationId = 'selected_organization_id';

  /// Curseur `nextCursor` du dernier `GET /v1/sync/pull` réussi, à repasser
  /// en `since` (voir `docs/api/phase5-contract.md`). Une valeur absente
  /// déclenche un préchargement complet.
  static const String syncPullCursor = 'sync.pull_cursor';

  /// Horodatage local (ISO 8601) du dernier préchargement réussi : sert au
  /// bandeau « Données du … » et au calcul de la purge par `retentionHours`.
  static const String syncLastPulledAt = 'sync.last_pulled_at';

  /// JSON de `MobileConfig` (dernière valeur connue de
  /// `GET /v1/mobile/config`), utilisée hors ligne à défaut de réponse
  /// fraîche.
  static const String mobileConfigCache = 'sync.mobile_config_cache';
}
