import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/storage/secret_key_store.dart';

/// Trousseau en mémoire, pour tester `DbEncryption` sans canal de
/// plateforme réel (`flutter_secure_storage` en dépend en production).
class _InMemorySecretKeyStore implements SecretKeyStore {
  final Map<String, String> _values = {};

  @override
  Future<String?> read(String key) async => _values[key];

  @override
  Future<void> write(String key, String value) async {
    _values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    _values.remove(key);
  }
}

void main() {
  late Directory tempDir;

  setUp(() {
    tempDir = Directory.systemTemp.createTempSync('immodesk_db_encryption');
  });

  tearDown(() {
    if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
  });

  test('génère une clé de 256 bits (64 caractères hexadécimaux)', () async {
    final store = _InMemorySecretKeyStore();
    final file = File('${tempDir.path}/immodesk.sqlite');
    final String key = await DbEncryption.ensureKey(store, file);
    expect(key.length, 64);
    expect(RegExp(r'^[0-9a-f]{64}$').hasMatch(key), isTrue);
  });

  test('conserve la même clé entre deux appels successifs', () async {
    final store = _InMemorySecretKeyStore();
    final file = File('${tempDir.path}/immodesk.sqlite');
    final String first = await DbEncryption.ensureKey(store, file);
    final String second = await DbEncryption.ensureKey(store, file);
    expect(second, first);
  });

  test('supprime une base existante sans clé connue (héritée ou clé perdue) '
      'plutôt que de tenter une migration', () async {
    final store = _InMemorySecretKeyStore();
    final file = File('${tempDir.path}/immodesk.sqlite');
    file.writeAsStringSync('base en clair héritée des phases 0 à 4');
    expect(file.existsSync(), isTrue);

    await DbEncryption.ensureKey(store, file);

    expect(file.existsSync(), isFalse);
  });

  test('resetDatabaseAndKey supprime la base et la clé', () async {
    final store = _InMemorySecretKeyStore();
    final file = File('${tempDir.path}/immodesk.sqlite');
    await DbEncryption.ensureKey(store, file);
    file.writeAsStringSync('contenu chiffré simulé');

    await DbEncryption.resetDatabaseAndKey(store, file);

    expect(file.existsSync(), isFalse);
    expect(await store.read(DbEncryption.secureStorageKey), isNull);
  });
}
