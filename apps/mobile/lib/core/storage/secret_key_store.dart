import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Petite abstraction autour d'un trousseau clé/valeur chiffré, pour
/// pouvoir tester `DbEncryption` (`lib/core/db/app_database.dart`) sans
/// canal de plateforme réel (`flutter_secure_storage` s'appuie sur des
/// canaux natifs indisponibles en test unitaire pur).
abstract class SecretKeyStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

/// Implémentation de production : délègue à `flutter_secure_storage`
/// (trousseau iOS, Keystore Android).
class FlutterSecureSecretKeyStore implements SecretKeyStore {
  const FlutterSecureSecretKeyStore(this._storage);

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}
