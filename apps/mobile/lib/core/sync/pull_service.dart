import 'dart:convert';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../features/leases/domain/entities/lease_status.dart';
import '../db/app_database.dart';
import '../format/text_normalize.dart';
import '../storage/app_settings_keys.dart';
import 'sync_pull_dto.dart';
import 'sync_remote_data_source.dart';

part 'pull_service.g.dart';

/// Préchargement du périmètre du démarcheur (`GET /v1/sync/pull`) et purge
/// des données de référence après `retentionHours` sans synchronisation
/// réussie (`docs/api/phase5-contract.md`, épic 5.A).
///
/// La purge ne touche **jamais** l'`outbox` (`AppDatabase.purgeReferenceData`
/// ne cible que les tables miroir).
class PullService {
  PullService(this._db, this._remote);

  final AppDatabase _db;
  final SyncRemoteDataSource _remote;

  /// Appelle `/v1/sync/pull` (curseur mémorisé localement) et remplace le
  /// contenu des tables miroir. Un appel sans curseur (première synchro,
  /// ou après réinitialisation de la base) renvoie le périmètre complet.
  Future<SyncPullResult> pullAndStore(String organizationId) async {
    final String? cursor = await _db.getSetting(AppSettingsKeys.syncPullCursor);
    final SyncPullResult result = await _remote.pull(
      organizationId,
      since: cursor,
    );
    await _store(organizationId, result);
    await _db.setSetting(AppSettingsKeys.syncPullCursor, result.nextCursor);
    await _db.setSetting(
      AppSettingsKeys.syncLastPulledAt,
      DateTime.now().toIso8601String(),
    );
    return result;
  }

  Future<void> _store(String organizationId, SyncPullResult result) async {
    final changed = result.changed;
    await _db.replaceCachedProperties(
      organizationId,
      changed.properties
          .map(
            (p) => CachedPropertyRow(
              id: p.id,
              organizationId: organizationId,
              name: p.name,
              city: p.city,
              payload: jsonEncode(p.toJson()),
              cachedAt: DateTime.now(),
            ),
          )
          .toList(),
    );
    for (final unit in changed.units) {
      await _db
          .into(_db.cachedUnits)
          .insertOnConflictUpdate(
            CachedUnitRow(
              id: unit.id,
              organizationId: organizationId,
              propertyId: unit.propertyId,
              payload: jsonEncode(unit.toJson()),
              cachedAt: DateTime.now(),
            ),
          );
    }
    await _db.replaceCachedTenants(
      organizationId,
      changed.tenants
          .map(
            (t) => CachedTenantRow(
              id: t.id,
              organizationId: organizationId,
              displayName: t.displayName,
              phone: t.primaryPhone,
              normalizedSearchText: normalizeSearchText(
                '${t.displayName} ${t.primaryPhone} ${t.whatsappPhone ?? ''}',
              ),
              payload: jsonEncode(t.toJson()),
              cachedAt: DateTime.now(),
            ),
          )
          .toList(),
    );
    for (final lease in changed.leases) {
      await _db.upsertCachedLease(
        CachedLeaseRow(
          id: lease.id,
          organizationId: organizationId,
          unitId: lease.unit.id,
          tenantId: lease.tenant.id,
          propertyId: lease.property.id,
          status: leaseStatusToApiValue(lease.status),
          payload: jsonEncode(lease.toJson()),
          cachedAt: DateTime.now(),
        ),
      );
    }
    await _db.replaceCachedInvoicesForOrganization(
      organizationId,
      changed.invoices
          .map(
            (i) => CachedInvoiceRow(
              id: i.id,
              organizationId: organizationId,
              leaseId: i.lease.id,
              propertyId: i.property.id,
              dueDate: i.dueDate,
              payload: jsonEncode(i.toJson()),
              cachedAt: DateTime.now(),
            ),
          )
          .toList(),
    );
    await _db.replaceCachedCashReceiptsForOrganization(
      organizationId,
      changed.cashReceipts
          .map(
            (c) => CachedCashReceiptRow(
              id: c.id,
              organizationId: organizationId,
              payload: jsonEncode(c.toJson()),
              cachedAt: DateTime.now(),
            ),
          )
          .toList(),
    );
    await _db.replaceCachedRemittancesForOrganization(
      organizationId,
      changed.remittances
          .map(
            (r) => CachedRemittanceRow(
              id: r.id,
              organizationId: organizationId,
              payload: jsonEncode(r.toJson()),
              cachedAt: DateTime.now(),
            ),
          )
          .toList(),
    );
  }

  /// Date de la dernière copie locale réussie (bandeau « Données du … »).
  Future<DateTime?> lastPulledAt() async {
    final String? raw = await _db.getSetting(AppSettingsKeys.syncLastPulledAt);
    if (raw == null) return null;
    return DateTime.tryParse(raw);
  }

  /// Purge les référentiels si la dernière synchronisation réussie remonte
  /// à plus de `retentionHours`. Ne touche jamais l'outbox.
  Future<bool> purgeIfStale(String organizationId, int retentionHours) async {
    final DateTime? last = await lastPulledAt();
    if (last == null) return false;
    final bool stale =
        DateTime.now().difference(last) > Duration(hours: retentionHours);
    if (stale) {
      await _db.purgeReferenceData(organizationId);
      await _db.deleteSetting(AppSettingsKeys.syncPullCursor);
      await _db.deleteSetting(AppSettingsKeys.syncLastPulledAt);
    }
    return stale;
  }
}

@riverpod
PullService pullService(Ref ref) {
  return PullService(
    ref.watch(appDatabaseProvider),
    ref.watch(syncRemoteDataSourceProvider),
  );
}
