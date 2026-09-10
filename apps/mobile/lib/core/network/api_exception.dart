import 'package:dio/dio.dart';

/// Erreur métier typée `{code, message}`, alignée sur le contrat d'API
/// (`docs/api/phase0-contract.md`) : codes stables `DOMAINE.RAISON`,
/// messages en français (fr-CG).
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.details,
    this.statusCode,
  });

  final String code;
  final String message;
  final Map<String, dynamic>? details;
  final int? statusCode;

  static const Map<String, String> _defaultMessages = <String, String>{
    'IAM.OTP_INVALID': 'Code incorrect.',
    'IAM.OTP_LOCKED': 'Trop de tentatives. Demandez un nouveau code.',
    'IAM.RATE_LIMITED': 'Trop de demandes. Réessayez dans quelques minutes.',
    'IAM.REFRESH_REVOKED': 'Votre session a expiré. Veuillez vous reconnecter.',
    'NETWORK.UNREACHABLE':
        'Impossible de joindre le serveur. Vérifiez votre connexion.',
    'NETWORK.TIMEOUT': 'Le serveur met trop de temps à répondre.',
    'UNKNOWN': 'Une erreur inattendue est survenue.',
  };

  factory ApiException.fromDioException(DioException error) {
    final Response<dynamic>? response = error.response;
    final Object? data = response?.data;
    if (response != null && data is Map<String, dynamic>) {
      final String code = (data['code'] as String?) ?? 'UNKNOWN';
      final String message = (data['message'] as String?) ??
          _defaultMessages[code] ??
          _defaultMessages['UNKNOWN']!;
      return ApiException(
        code: code,
        message: message,
        details: data['details'] as Map<String, dynamic>?,
        statusCode: response.statusCode,
      );
    }

    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          code: 'NETWORK.TIMEOUT',
          message: _defaultMessages['NETWORK.TIMEOUT']!,
        );
      case DioExceptionType.connectionError:
        return ApiException(
          code: 'NETWORK.UNREACHABLE',
          message: _defaultMessages['NETWORK.UNREACHABLE']!,
        );
      default:
        return ApiException(
          code: 'UNKNOWN',
          message: error.message ?? _defaultMessages['UNKNOWN']!,
        );
    }
  }

  @override
  String toString() => 'ApiException($code): $message';
}
