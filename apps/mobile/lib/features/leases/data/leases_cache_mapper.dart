import 'dart:convert';

import '../../../core/db/app_database.dart';
import '../domain/entities/lease_detail.dart';
import '../domain/entities/lease_status.dart';
import '../domain/entities/lease_summary.dart';

/// Conversions entre les entités du domaine et les lignes Drift mises en
/// cache (`CachedLeases`). Le `payload` stocke soit un `LeaseSummary` (liste
/// des baux), soit un `LeaseDetail` complet (fiche lot/locataire ou fiche
/// bail déjà consultée) : les deux partagent les mêmes noms de champs pour
/// le sous-ensemble commun (voir `LeaseSummary`, `LeaseDetail.toJson`).
abstract final class LeasesCacheMapper {
  static CachedLeaseRow toRowFromSummary(
    String organizationId,
    LeaseSummary summary,
  ) {
    return CachedLeaseRow(
      id: summary.id,
      organizationId: organizationId,
      unitId: summary.unit.id,
      tenantId: summary.tenant.id,
      propertyId: summary.property.id,
      status: leaseStatusToApiValue(summary.status),
      payload: jsonEncode(summary.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static CachedLeaseRow toRowFromDetail(
    String organizationId,
    LeaseDetail detail,
  ) {
    return CachedLeaseRow(
      id: detail.id,
      organizationId: organizationId,
      unitId: detail.unit.id,
      tenantId: detail.tenant.id,
      propertyId: detail.property.id,
      status: leaseStatusToApiValue(detail.status),
      payload: jsonEncode(detail.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static LeaseSummary summaryFromRow(CachedLeaseRow row) {
    return LeaseSummary.fromJson(
      jsonDecode(row.payload) as Map<String, dynamic>,
    );
  }

  /// Reconstitue un `LeaseDetail` à partir d'une ligne de cache. Si la
  /// ligne ne contenait qu'un `LeaseSummary` (jamais consulté en détail),
  /// les champs propres au détail (`parties`, `deposit`, `documents`,
  /// `rentRevisions`) restent à leurs valeurs par défaut (listes vides,
  /// dépôt inconnu).
  static LeaseDetail detailFromRow(CachedLeaseRow row) {
    return LeaseDetail.fromJson(
      jsonDecode(row.payload) as Map<String, dynamic>,
    );
  }
}
