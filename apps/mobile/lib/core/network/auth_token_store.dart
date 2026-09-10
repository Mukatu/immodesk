import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage des jetons d'authentification.
///
/// Le jeton d'accès (courte durée, 15 min) reste en mémoire uniquement.
/// Le jeton de rafraîchissement (30 j, rotatif) est chiffré dans le
/// trousseau du système via `flutter_secure_storage`.
class AuthTokenStore {
  AuthTokenStore(this._secureStorage);

  final FlutterSecureStorage _secureStorage;

  static const String _refreshTokenKey = 'immodesk.refresh_token';

  String? _accessToken;

  String? get accessToken => _accessToken;

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  Future<String?> readRefreshToken() {
    return _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> saveRefreshToken(String token) {
    return _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  Future<void> clear() async {
    _accessToken = null;
    await _secureStorage.delete(key: _refreshTokenKey);
  }
}
