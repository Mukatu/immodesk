import 'dart:io';
import 'dart:math';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';
import 'package:sqlite3/open.dart' as sqlite3_open;

import '../storage/secret_key_store.dart';
import '../storage/secure_storage_provider.dart';

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
/// Généralisée en phase 5 (`docs/api/phase5-contract.md` « Côté mobile ») :
/// le `SyncEngine` (`lib/core/sync`) y range aussi bien les opérations
/// `CASH_RECEIPT` et `DOCUMENT` de l'enveloppe de synchronisation que
/// l'ancienne opération `documents.property_photo.create` (phase 1,
/// `PhotoOutboxService`, mécanisme conservé tel quel). La file n'est
/// **jamais** purgée automatiquement : elle contient de l'argent encaissé
/// (voir `docs/_DECISIONS_COMMUNES.md`).
@DataClassName('OutboxRow')
class Outbox extends Table {
  /// ULID généré sur l'appareil : clé d'idempotence côté API.
  TextColumn get clientRef => text()();
  TextColumn get organizationId => text()();

  /// `CASH_RECEIPT`, `DOCUMENT`, ou (legacy) `documents.property_photo.create`.
  TextColumn get operation => text()();

  /// JSON canonique de la commande à rejouer (`payload` de l'enveloppe).
  TextColumn get payload => text()();

  /// Ordre de rejeu : JSON d'un tableau de `clientRef` (`dependsOn` du
  /// contrat), à appliquer avant celle-ci dans le même lot.
  TextColumn get dependsOnClientRef => text().nullable()();
  IntColumn get attemptCount => integer().withDefault(const Constant(0))();

  /// PENDING, SENDING, SENT, FAILED, CONFLICT.
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  TextColumn get lastErrorCode => text().nullable()();

  /// Message en français, affichable tel quel au démarcheur.
  TextColumn get lastErrorMessage => text().nullable()();

  /// `batchRef` (ULID) du lot en cours d'envoi : conservé et rejoué tel
  /// quel après une coupure, jamais régénéré.
  TextColumn get batchRef => text().nullable()();
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

/// Factures dues mises en cache (tournée du démarcheur), pour un affichage
/// hors ligne en lecture seule de « Ma tournée ». L'encaissement reste
/// exclu du hors ligne en phase 3 (message clair « connexion requise »,
/// voir `EncaissementController`) : ce cache ne sert qu'à la consultation.
@DataClassName('CachedInvoiceRow')
class CachedInvoices extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();
  TextColumn get leaseId => text()();
  TextColumn get propertyId => text()();
  TextColumn get dueDate => text()();

  /// JSON de `InvoiceSummary`.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Reçus de caisse mis en cache (périmètre du démarcheur, `GET
/// /v1/sync/pull`) : consultation hors ligne de ses propres encaissements.
@DataClassName('CachedCashReceiptRow')
class CachedCashReceipts extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();

  /// JSON de `CashReceiptSummary`.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Remise de caisse en cours mise en cache (périmètre du démarcheur).
@DataClassName('CachedRemittanceRow')
class CachedRemittances extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();

  /// JSON de `RemittanceSummary`.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Relances mises en cache (`feature dunning`, phase 9) : consultation hors
/// ligne en lecture seule de l'historique déjà envoyé à un locataire.
/// Aucune écriture, aucune file d'attente — indexé par locataire plutôt
/// que par organisation seule, car le contrat (`GET /v1/dunning-runs`) ne
/// filtre pas par locataire et la lecture se fait donc par lots successifs
/// (voir `DunningRepositoryImpl`).
@DataClassName('CachedDunningRunRow')
class CachedDunningRuns extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text()();
  TextColumn get tenantId => text()();

  /// JSON de `DunningRun`.
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Base locale Drift (SQLite), chiffrée par défaut (SQLCipher) depuis la
/// phase 5 — voir `docs/api/phase5-contract.md` « Côté mobile » et
/// `_openConnection` ci-dessous pour la génération/lecture de la clé.
@DriftDatabase(
  tables: [
    AppSettings,
    Outbox,
    CachedProperties,
    CachedUnits,
    CachedTenants,
    CachedLeases,
    CachedInvoices,
    CachedCashReceipts,
    CachedRemittances,
    CachedDunningRuns,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(SecretKeyStore secretKeyStore)
    : super(_openConnection(secretKeyStore));

  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 6;

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
      if (from < 4) {
        await m.createTable(cachedInvoices);
      }
      if (from < 5) {
        // Outbox généralisée (SyncEngine, phase 5) : nouvelles colonnes de
        // suivi de lot, sans jamais toucher aux lignes existantes.
        await m.addColumn(outbox, outbox.lastErrorMessage);
        await m.addColumn(outbox, outbox.batchRef);
        await m.createTable(cachedCashReceipts);
        await m.createTable(cachedRemittances);
      }
      if (from < 6) {
        await m.createTable(cachedDunningRuns);
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

  Future<void> replaceCachedInvoicesForOrganization(
    String organizationId,
    List<CachedInvoiceRow> rows,
  ) async {
    await transaction(() async {
      await (delete(
        cachedInvoices,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      for (final CachedInvoiceRow row in rows) {
        await into(cachedInvoices).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedInvoiceRow>> getCachedInvoicesForOrganization(
    String organizationId,
  ) {
    return (select(
      cachedInvoices,
    )..where((tbl) => tbl.organizationId.equals(organizationId))).get();
  }

  Future<void> replaceCachedCashReceiptsForOrganization(
    String organizationId,
    List<CachedCashReceiptRow> rows,
  ) async {
    await transaction(() async {
      await (delete(
        cachedCashReceipts,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      for (final CachedCashReceiptRow row in rows) {
        await into(cachedCashReceipts).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedCashReceiptRow>> getCachedCashReceiptsForOrganization(
    String organizationId,
  ) {
    return (select(
      cachedCashReceipts,
    )..where((tbl) => tbl.organizationId.equals(organizationId))).get();
  }

  Future<void> replaceCachedRemittancesForOrganization(
    String organizationId,
    List<CachedRemittanceRow> rows,
  ) async {
    await transaction(() async {
      await (delete(
        cachedRemittances,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      for (final CachedRemittanceRow row in rows) {
        await into(cachedRemittances).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedRemittanceRow>> getCachedRemittancesForOrganization(
    String organizationId,
  ) {
    return (select(
      cachedRemittances,
    )..where((tbl) => tbl.organizationId.equals(organizationId))).get();
  }

  /// Remplace le cache des relances d'un locataire précis, sans toucher
  /// aux autres locataires déjà mis en cache (le contrat `GET
  /// /v1/dunning-runs` ne filtre pas par locataire — voir
  /// `DunningRepositoryImpl`, qui parcourt un nombre borné de pages).
  Future<void> replaceCachedDunningRunsForTenant(
    String organizationId,
    String tenantId,
    List<CachedDunningRunRow> rows,
  ) async {
    await transaction(() async {
      await (delete(cachedDunningRuns)..where(
            (tbl) =>
                tbl.organizationId.equals(organizationId) &
                tbl.tenantId.equals(tenantId),
          ))
          .go();
      for (final CachedDunningRunRow row in rows) {
        await into(cachedDunningRuns).insertOnConflictUpdate(row);
      }
    });
  }

  Future<List<CachedDunningRunRow>> getCachedDunningRunsForTenant(
    String organizationId,
    String tenantId,
  ) {
    return (select(cachedDunningRuns)..where(
          (tbl) =>
              tbl.organizationId.equals(organizationId) &
              tbl.tenantId.equals(tenantId),
        ))
        .get();
  }

  /// Purge les données de référence préchargées (tournée) sans jamais
  /// toucher à l'`outbox` : au-delà de `retentionHours` sans synchronisation
  /// réussie, ce cache est effacé (voir `docs/api/phase5-contract.md`).
  /// `PreloadService` appelle cette méthode ; elle laisse intacts
  /// `app_settings` (dont le curseur de tournée, remis à zéro séparément)
  /// et `outbox`.
  Future<void> purgeReferenceData(String organizationId) async {
    await transaction(() async {
      await (delete(
        cachedProperties,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedUnits,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedTenants,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedLeases,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedInvoices,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedCashReceipts,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedRemittances,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
      await (delete(
        cachedDunningRuns,
      )..where((tbl) => tbl.organizationId.equals(organizationId))).go();
    });
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

/// Chiffrement au repos de la base locale (SQLCipher), activé par défaut
/// depuis la phase 5 (`docs/api/phase5-contract.md` « Côté mobile »).
///
/// La clé est un aléa de 256 bits généré à la première ouverture et
/// conservé uniquement dans le stockage sécurisé du système
/// (`flutter_secure_storage`), jamais dans la base elle-même. Si aucune clé
/// n'est connue alors qu'un fichier de base existe déjà — base en clair
/// héritée des phases 0 à 4, ou clé perdue —, le contrat impose de
/// supprimer ce fichier plutôt que de tenter une migration : voir le README
/// (section « Réinitialisation de la base locale »).
abstract final class DbEncryption {
  static const String secureStorageKey = 'immodesk.db_encryption_key_v1';
  static bool _cipherConfigured = false;

  /// À appeler dans l'isolate qui ouvrira réellement la base
  /// (`isolateSetup`) : `open.overrideFor` est un état par isolate, non
  /// partagé avec l'isolate principal qui a généré la clé.
  static void configureCipherLoader() {
    if (_cipherConfigured) return;
    sqlite3_open.open.overrideFor(
      sqlite3_open.OperatingSystem.android,
      openCipherOnAndroid,
    );
    _cipherConfigured = true;
  }

  /// Clé hexadécimale (64 caractères = 256 bits) pour `PRAGMA key`. La
  /// génère si absente, en supprimant au passage tout fichier de base
  /// existant qu'elle ne pourrait pas déchiffrer.
  static Future<String> ensureKey(
    SecretKeyStore secretKeyStore,
    File dbFile,
  ) async {
    final String? existingKey = await secretKeyStore.read(secureStorageKey);
    if (existingKey != null) return existingKey;

    await _deleteDatabaseFiles(dbFile);
    final String key = _generateHexKey();
    await secretKeyStore.write(secureStorageKey, key);
    return key;
  }

  /// Réinitialisation manuelle (perte de clé, support technique) : supprime
  /// la base chiffrée et sa clé. L'appelant doit fermer l'`AppDatabase`
  /// courante avant d'invoquer cette méthode, puis recréer le provider et
  /// relancer un préchargement complet (`docs/04_plan_de_phases.md` §5.10).
  static Future<void> resetDatabaseAndKey(
    SecretKeyStore secretKeyStore,
    File dbFile,
  ) async {
    await secretKeyStore.delete(secureStorageKey);
    await _deleteDatabaseFiles(dbFile);
  }

  static Future<void> _deleteDatabaseFiles(File dbFile) async {
    for (final String suffix in ['', '-wal', '-shm', '-journal']) {
      final File f = File('${dbFile.path}$suffix');
      if (f.existsSync()) await f.delete();
    }
  }

  static String _generateHexKey() {
    final Random random = Random.secure();
    const String hexDigits = '0123456789abcdef';
    final StringBuffer buffer = StringBuffer();
    for (int i = 0; i < 64; i++) {
      buffer.write(hexDigits[random.nextInt(16)]);
    }
    return buffer.toString();
  }
}

Future<File> resolveDatabaseFile() async {
  final Directory dbFolder = await getApplicationDocumentsDirectory();
  return File(p.join(dbFolder.path, 'immodesk.sqlite'));
}

LazyDatabase _openConnection(SecretKeyStore secretKeyStore) {
  return LazyDatabase(() async {
    final File file = await resolveDatabaseFile();
    final String key = await DbEncryption.ensureKey(secretKeyStore, file);
    return NativeDatabase.createInBackground(
      file,
      isolateSetup: DbEncryption.configureCipherLoader,
      setup: (rawDb) {
        rawDb.execute("PRAGMA key = \"x'$key'\";");
        rawDb.execute('PRAGMA cipher_compatibility = 4;');
      },
    );
  });
}

final Provider<AppDatabase> appDatabaseProvider = Provider<AppDatabase>((ref) {
  final AppDatabase database = AppDatabase(
    FlutterSecureSecretKeyStore(ref.watch(secureStorageProvider)),
  );
  ref.onDispose(database.close);
  return database;
});
