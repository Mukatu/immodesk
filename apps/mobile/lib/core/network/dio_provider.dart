import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/env.dart';
import 'auth_events.dart';
import 'auth_interceptor.dart';
import 'auth_token_store.dart';

final Provider<FlutterSecureStorage> secureStorageProvider =
    Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
});

final Provider<AuthTokenStore> authTokenStoreProvider =
    Provider<AuthTokenStore>((ref) {
  return AuthTokenStore(ref.watch(secureStorageProvider));
});

final Provider<AuthEventBus> authEventBusProvider = Provider<AuthEventBus>((
  ref,
) {
  final AuthEventBus bus = AuthEventBus();
  ref.onDispose(bus.dispose);
  return bus;
});

/// Émet un événement chaque fois que la session doit être considérée comme
/// expirée (échec du rafraîchissement du jeton depuis l'intercepteur dio).
final StreamProvider<void> sessionExpiredStreamProvider = StreamProvider<void>(
  (ref) => ref.watch(authEventBusProvider).onSessionExpired,
);

/// Client dio configuré avec l'URL de base de l'environnement et
/// l'intercepteur d'authentification (en-tête `Authorization`,
/// rafraîchissement automatique et file d'attente sur 401).
final Provider<Dio> dioProvider = Provider<Dio>((ref) {
  final AuthTokenStore tokenStore = ref.watch(authTokenStoreProvider);
  final AuthEventBus eventBus = ref.watch(authEventBusProvider);

  final Dio refreshDio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      headers: const {'Content-Type': 'application/json'},
    ),
  );

  final Dio dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(
    AuthInterceptor(
      tokenStore: tokenStore,
      refreshDio: refreshDio,
      baseUrl: Env.apiBaseUrl,
      onSessionExpired: () async {
        eventBus.notifySessionExpired();
      },
    ),
  );

  return dio;
});
