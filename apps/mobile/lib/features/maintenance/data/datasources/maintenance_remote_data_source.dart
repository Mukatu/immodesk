import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/maintenance_detail.dart';
import '../../domain/entities/maintenance_summary.dart';

/// Appels HTTP bruts de `docs/api/phase8-contract.md` (§ Maintenance).
class MaintenanceRemoteDataSource {
  MaintenanceRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<List<MaintenanceSummary>> fetchAssigned(
    String organizationId,
    String assignedToUserId,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/maintenance-requests',
        queryParameters: <String, dynamic>{
          'assignedToUserId': assignedToUserId,
          'limit': 100,
        },
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map(
            (dynamic e) =>
                MaintenanceSummary.fromJson(e as Map<String, dynamic>),
          )
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<MaintenanceDetail> fetchDetail(
    String organizationId,
    String id,
  ) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/maintenance-requests/$id',
        options: _orgHeaders(organizationId),
      );
      return MaintenanceDetail.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Map<String, dynamic>> postUpdate(
    String organizationId,
    String id,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/maintenance-requests/$id/updates',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
