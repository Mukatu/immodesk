import 'dart:convert';

import '../../../core/db/app_database.dart';
import '../domain/entities/dunning_run.dart';

/// Conversion entre `DunningRun` (réseau) et `CachedDunningRunRow` (Drift),
/// même schéma que `CollectionCacheMapper` : le payload JSON complet est
/// stocké, les colonnes indexées ne servent qu'aux requêtes locales par
/// locataire.
abstract final class DunningCacheMapper {
  static CachedDunningRunRow toRow(
    String organizationId,
    String tenantId,
    DunningRun run,
  ) {
    return CachedDunningRunRow(
      id: run.id,
      organizationId: organizationId,
      tenantId: tenantId,
      payload: jsonEncode(run.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static DunningRun fromRow(CachedDunningRunRow row) {
    return DunningRun.fromJson(jsonDecode(row.payload) as Map<String, dynamic>);
  }
}
