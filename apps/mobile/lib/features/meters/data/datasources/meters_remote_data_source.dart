import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/meter.dart';

/// Appels HTTP bruts de `docs/api/phase8-contract.md` (§ Compteurs).
class MetersRemoteDataSource {
  MetersRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<List<Meter>> fetchMeters(
    String organizationId, {
    String? unitId,
    String? propertyId,
  }) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/meters',
        queryParameters: <String, dynamic>{
          'unitId': ?unitId,
          'propertyId': ?propertyId,
          'limit': 100,
        },
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map((dynamic e) => Meter.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Map<String, dynamic>> createReading(
    String organizationId,
    String meterId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/meters/$meterId/readings',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
