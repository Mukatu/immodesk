// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_session_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Session applicative : utilisateur courant et organisations dont il est
/// membre. Tente une restauration silencieuse au démarrage à partir du
/// jeton de rafraîchissement stocké dans `flutter_secure_storage` (la
/// requête `/me` échoue en 401 sans jeton d'accès en mémoire, ce qui
/// déclenche naturellement le rafraîchissement automatique de
/// `AuthInterceptor`).

@ProviderFor(AuthSessionController)
final authSessionControllerProvider = AuthSessionControllerProvider._();

/// Session applicative : utilisateur courant et organisations dont il est
/// membre. Tente une restauration silencieuse au démarrage à partir du
/// jeton de rafraîchissement stocké dans `flutter_secure_storage` (la
/// requête `/me` échoue en 401 sans jeton d'accès en mémoire, ce qui
/// déclenche naturellement le rafraîchissement automatique de
/// `AuthInterceptor`).
final class AuthSessionControllerProvider
    extends $AsyncNotifierProvider<AuthSessionController, AuthSessionState> {
  /// Session applicative : utilisateur courant et organisations dont il est
  /// membre. Tente une restauration silencieuse au démarrage à partir du
  /// jeton de rafraîchissement stocké dans `flutter_secure_storage` (la
  /// requête `/me` échoue en 401 sans jeton d'accès en mémoire, ce qui
  /// déclenche naturellement le rafraîchissement automatique de
  /// `AuthInterceptor`).
  AuthSessionControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'authSessionControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$authSessionControllerHash();

  @$internal
  @override
  AuthSessionController create() => AuthSessionController();
}

String _$authSessionControllerHash() =>
    r'e933540fe03e5cf0f67e4cbdc81018b4cba020e0';

/// Session applicative : utilisateur courant et organisations dont il est
/// membre. Tente une restauration silencieuse au démarrage à partir du
/// jeton de rafraîchissement stocké dans `flutter_secure_storage` (la
/// requête `/me` échoue en 401 sans jeton d'accès en mémoire, ce qui
/// déclenche naturellement le rafraîchissement automatique de
/// `AuthInterceptor`).

abstract class _$AuthSessionController
    extends $AsyncNotifier<AuthSessionState> {
  FutureOr<AuthSessionState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<AuthSessionState>, AuthSessionState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<AuthSessionState>, AuthSessionState>,
              AsyncValue<AuthSessionState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
