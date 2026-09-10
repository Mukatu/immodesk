/// Configuration par environnement, injectée via `--dart-define`.
///
/// Exemple :
/// `flutter run --dart-define=API_BASE_URL=https://api.staging.immodesk.cg/v1`
abstract final class Env {
  /// URL de base de l'API (préfixe `/v1` inclus).
  ///
  /// Par défaut, pointe vers l'hôte spécial de l'émulateur Android
  /// (`10.0.2.2`) qui redirige vers `localhost` de la machine hôte.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/v1',
  );

  /// Code OTP fixe accepté en développement (voir `FakeSmsProvider` côté API).
  /// Vide en production.
  static const String otpDevCode = String.fromEnvironment('OTP_DEV_CODE');
}
