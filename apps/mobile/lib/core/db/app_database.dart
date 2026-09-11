import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

/// Table clé/valeur pour les réglages locaux (organisation sélectionnée,
/// préférences d'affichage, etc.).
@DataClassName('AppSettingRow')
class AppSettings extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

/// Table d'écritures en attente de synchronisation (démarcheurs hors ligne).
///
/// Vide en phase 0 : la logique de remplissage et de rejeu (`SyncEngine`,
/// voir `docs/02_architecture_technique.md` §10) arrive en phase 5. Le
/// schéma est posé dès maintenant pour éviter une migration disruptive
/// plus tard.
@DataClassName('OutboxRow')
class Outbox extends Table {
  /// ULID généré sur l'appareil : clé d'idempotence côté API.
  TextColumn get clientRef => text()();
  TextColumn get organizationId => text()();

  /// Ex. `cash_receipt.create`, `remittance.close`…
  TextColumn get operation => text()();

  /// JSON canonique de la commande à rejouer.
  TextColumn get payload => text()();

  /// Ordre de rejeu : ULID de l'opération dont celle-ci dépend.
  TextColumn get dependsOnClientRef => text().nullable()();
  IntColumn get attemptCount => integer().withDefault(const Constant(0))();

  /// PENDING, SENDING, ACKED, REJECTED.
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  TextColumn get lastErrorCode => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get nextAttemptAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {clientRef};
}

/// Cache local d'un référentiel (immeubles, lots ou locataires) : lecture
/// hors ligne de la dernière copie connue, rafraîchie à chaque ouverture
/// d'écran quand le réseau est disponible (voir `PortfolioRepositoryImpl`).
@DataClassName('CachedPropertyRow')
class CachedProperties extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();
  TextColumn get name => text()();
  TextColumn get city => text()();

  /// JSON complet de `PropertySummary`.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Lots mis en cache (issus des listes `PropertyDetail.units` consultées).
@DataClassName('CachedUnitRow')
class CachedUnits extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();
  TextColumn get propertyId => text()();

  /// JSON de `Unit` (caractéristiques + loyer de référence).
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Locataires mis en cache, avec un champ de recherche normalisé (sans
/// accents, minuscules) pour permettre une recherche locale hors ligne.
@DataClassName('CachedTenantRow')
class CachedTenants extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();
  TextColumn get displayName => text()();
  TextColumn get phone => text()();
  TextColumn get normalizedSearchText => text()();

  /// JSON de `Tenant`.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Baux mis en cache (résumé de liste ou détail complet — voir
/// `LeasesCacheMapper` : `LeaseSummary.fromJson` ignore les clés en trop
/// d'un `LeaseDetail` complet, donc un même `payload` sert aux deux vues).
@DataClassName('CachedLeaseRow')
class CachedLeases extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();
  TextColumn get unitId => text()();
  TextColumn get tenantId => text()();
  TextColumn get propertyId => text()();
  TextColumn get status => text()();

  /// JSON de `LeaseSummary` ou `LeaseDetail` selon le dernier appel réseau.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Base locale Drift (SQLite).
///
/// Chiffrement : NON activé en phase 0. `sqlcipher_flutter_libs` est prévu
/// pour la phase 5 (voir `docs/02_architecture_technique.md` §10.9) —
/// aucune donnée sensible n'est répliquée localement avant l'outbox de
/// collecte terrain.
@DriftDatabase(
  tables: [
    AppSettings,
    Outbox,
    CachedProperties,
    CachedUnits,
    CachedTenants,
    CachedLeases,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      if (from < 2) {
        await m.createTable(cachedProperties);
        await m.createTable(cachedUnits);
        await m.createTable(cachedTenants);
      }
      if (from < 3) {
        await m.createTable(cachedLeases);
      }
    },
  );

  Future<void> replaceCachedProperties(
    String organizationId,
    List<CachedPropertyRow> rows,
  ) async {
    await transaction(() async {
      await (delete(
        cachedProperties,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      for (final CachedPropertyRow row in rows) {
        await into(cachedProperties).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedPropertyRow>> getCachedProperties(String organizationId) {
    return (select(
      cachedProperties,
    )..where((tbl) => tbl.organizationId.equals(organizationId))).get();
  }

  Future<void> replaceCachedUnitsForProperty(
    String organizationId,
    String propertyId,
    List<CachedUnitRow> rows,
  ) async {
    await transaction(() async {
      await (delete(cachedUnits)..where(
            (tbl) =>
                tbl.organizationId.equals(organizationId) &
                tbl.propertyId.equals(propertyId),
          ))
          .go();
      for (final CachedUnitRow row in rows) {
        await into(cachedUnits).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedUnitRow>> getCachedUnitsForProperty(
    String organizationId,
    String propertyId,
  ) {
    return (select(cachedUnits)..where(
          (tbl) =>
              tbl.organizationId.equals(organizationId) &
              tbl.propertyId.equals(propertyId),
        ))
        .get();
  }

  Future<CachedUnitRow?> getCachedUnit(String unitId) {
    return (select(
      cachedUnits,
    )..where((tbl) => tbl.id.equals(unitId))).getSingleOrNull();
  }

  Future<void> replaceCachedTenants(
    String organizationId,
    List<CachedTenantRow> rows,
  ) async {
    await transaction(() async {
      await (delete(
        cachedTenants,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      for (final CachedTenantRow row in rows) {
        await into(cachedTenants).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedTenantRow>> getCachedTenants(String organizationId) {
    return (select(
      cachedTenants,
    )..where((tbl) => tbl.organizationId.equals(organizationId))).get();
  }

  Future<List<CachedTenantRow>> searchCachedTenants(
    String organizationId,
    String normalizedQuery,
  ) {
    return (select(cachedTenants)..where(
          (tbl) =>
              tbl.organizationId.equals(organizationId) &
              (tbl.normalizedSearchText.contains(normalizedQuery) |
                  tbl.phone.contains(normalizedQuery)),
        ))
        .get();
  }

  Future<void> replaceCachedLeasesForOrganization(
    String organizationId,
    List<CachedLeaseRow> rows,
  ) async {
    await transaction(() async {
      await (delete(
        cachedLeases,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      for (final CachedLeaseRow row in rows) {
        await into(cachedLeases).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedLeaseRow>> getCachedLeasesForOrganization(
    String organizationId,
  ) {
    return (select(
      cachedLeases,
    )..where((tbl) => tbl.organizationId.equals(organizationId))).get();
  }

  /// Mémorise (ou remplace) un bail précis, sans toucher aux autres lignes
  /// de l'organisation — utilisé après consultation du détail d'un bail
  /// depuis une fiche lot/locataire, pour ne pas invalider la liste.
  Future<void> upsertCachedLease(CachedLeaseRow row) {
    return into(cachedLeases).insertOnConflictUpdate(row);
  }

  Future<CachedLeaseRow?> getCachedLeaseForUnit(String unitId) async {
    final List<CachedLeaseRow> rows = await (select(
      cachedLeases,
    )..where((tbl) => tbl.unitId.equals(unitId))).get();
    return _mostRecentActive(rows);
  }

  Future<CachedLeaseRow?> getCachedLeaseForTenant(String tenantId) async {
    final List<CachedLeaseRow> rows = await (select(
      cachedLeases,
    )..where((tbl) => tbl.tenantId.equals(tenantId))).get();
    return _mostRecentActive(rows);
  }

  Future<CachedLeaseRow?> getCachedLeaseById(String leaseId) {
    return (select(
      cachedLeases,
    )..where((tbl) => tbl.id.equals(leaseId))).getSingleOrNull();
  }

  CachedLeaseRow? _mostRecentActive(List<CachedLeaseRow> rows) {
    final List<CachedLeaseRow> active = rows
        .where((r) => r.status == 'ACTIVE' || r.status == 'NOTICE_GIVEN')
        .toList();
    if (active.isEmpty) return null;
    active.sort((a, b) => b.cachedAt.compareTo(a.cachedAt));
    return active.first;
  }

  Future<String?> getSetting(String key) async {
    final AppSettingRow? row = await (select(
      appSettings,
    )..where((tbl) => tbl.key.equals(key))).getSingleOrNull();
    return row?.value;
  }

  Future<void> setSetting(String key, String value) {
    return into(
      appSettings,
    ).insertOnConflictUpdate(AppSettingRow(key: key, value: value));
  }

  Future<void> deleteSetting(String key) {
    return (delete(appSettings)..where((tbl) => tbl.key.equals(key))).go();
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final Directory dbFolder = await getApplicationDocumentsDirectory();
    final File file = File(p.join(dbFolder.path, 'immodesk.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

final Provider<AppDatabase> appDatabaseProvider = Provider<AppDatabase>((ref) {
  final AppDatabase database = AppDatabase();
  ref.onDispose(database.close);
  return database;
});
