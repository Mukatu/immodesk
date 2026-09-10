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

/// Base locale Drift (SQLite).
///
/// Chiffrement : NON activé en phase 0. `sqlcipher_flutter_libs` est prévu
/// pour la phase 5 (voir `docs/02_architecture_technique.md` §10.9) —
/// aucune donnée sensible n'est répliquée localement avant l'outbox de
/// collecte terrain.
@DriftDatabase(tables: [AppSettings, Outbox])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 1;

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

final Provider<AppDatabase> appDatabaseProvider = Provider<AppDatabase>((
  ref,
) {
  final AppDatabase database = AppDatabase();
  ref.onDispose(database.close);
  return database;
});
