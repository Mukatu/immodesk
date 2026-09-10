import 'dart:async';

import 'package:dio/dio.dart';

import 'auth_token_store.dart';

/// Intercepteur dio : ajoute le jeton d'accès sur les routes protégées et
/// gère le rafraîchissement automatique sur `401`.
///
/// Plusieurs requêtes en échec simultané ne déclenchent qu'un seul appel de
/// rafraîchissement : les suivantes attendent le résultat du premier
/// (`_refreshCompleter`), puis sont rejouées avec le nouveau jeton.
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.tokenStore,
    required this.refreshDio,
    required this.baseUrl,
    this.onSessionExpired,
  });

  final AuthTokenStore tokenStore;

  /// Client dio dédié au rafraîchissement, sans cet intercepteur, afin
  /// d'éviter toute récursion.
  final Dio refreshDio;

  final String baseUrl;

  final Future<void> Function()? onSessionExpired;

  Completer<bool>? _refreshCompleter;

  static const List<String> _publicPaths = <String>[
    '/auth/otp/request',
    '/auth/otp/verify',
    '/auth/refresh',
    '/health',
    '/openapi.json',
  ];

  bool _isPublic(String path) => _publicPaths.any(path.contains);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_isPublic(options.path) && tokenStore.accessToken != null) {
      options.headers['Authorization'] = 'Bearer ${tokenStore.accessToken}';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final Response<dynamic>? response = err.response;
    final RequestOptions requestOptions = err.requestOptions;
    final bool alreadyRetried = requestOptions.extra['immodeskRetried'] == true;

    if (response?.statusCode == 401 &&
        !_isPublic(requestOptions.path) &&
        !alreadyRetried) {
      final bool refreshed = await _refresh();
      if (refreshed) {
        try {
          requestOptions.extra['immodeskRetried'] = true;
          if (tokenStore.accessToken != null) {
            requestOptions.headers['Authorization'] =
                'Bearer ${tokenStore.accessToken}';
          }
          final Dio retryClient = Dio(BaseOptions(baseUrl: baseUrl));
          final Response<dynamic> retried = await retryClient.fetch<dynamic>(
            requestOptions,
          );
          return handler.resolve(retried);
        } on DioException catch (retryError) {
          return handler.next(retryError);
        }
      } else {
        await tokenStore.clear();
        if (onSessionExpired != null) {
          await onSessionExpired!();
        }
      }
    }

    handler.next(err);
  }

  /// Rafraîchit le couple access/refresh token. Les appels concurrents
  /// partagent le même résultat (file d'attente sur le `Completer`).
  Future<bool> _refresh() {
    final Completer<bool>? inFlight = _refreshCompleter;
    if (inFlight != null) {
      return inFlight.future;
    }

    final Completer<bool> completer = Completer<bool>();
    _refreshCompleter = completer;
    unawaited(_doRefresh(completer));
    return completer.future;
  }

  Future<void> _doRefresh(Completer<bool> completer) async {
    try {
      final String? refreshToken = await tokenStore.readRefreshToken();
      if (refreshToken == null) {
        completer.complete(false);
        return;
      }
      final Response<dynamic> response = await refreshDio.post<dynamic>(
        '/auth/refresh',
        data: <String, dynamic>{'refreshToken': refreshToken},
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      tokenStore.setAccessToken(data['accessToken'] as String);
      await tokenStore.saveRefreshToken(data['refreshToken'] as String);
      completer.complete(true);
    } catch (_) {
      completer.complete(false);
    } finally {
      _refreshCompleter = null;
    }
  }
}
