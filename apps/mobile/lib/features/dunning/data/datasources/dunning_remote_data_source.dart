import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/dunning_run.dart';

/// Une page de résultats de `GET /v1/dunning-runs`, avec le curseur de
/// pagination suivant (`pageInfo.nextCursor` du contrat).
class DunningRunsPage {
  const DunningRunsPage({required this.items, this.nextCursor});

  final List<DunningRun> items;
  final String? nextCursor;
}

/// Appels HTTP bruts de `docs/api/phase9-contract.md` (§ Routes, relances).
class DunningRemoteDataSource {
  DunningRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<DunningRunsPage> fetchRuns(
    String organizationId, {
    String? invoiceId,
    String? tenantId,
    String? cursor,
    int limit = 100,
  }) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/dunning-runs',
        queryParameters: <String, dynamic>{
          'invoiceId': ?invoiceId,
          'tenantId': ?tenantId,
          'cursor': ?cursor,
          'limit': limit,
        },
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      final Map<String, dynamic>? pageInfo =
          data['pageInfo'] as Map<String, dynamic>?;
      return DunningRunsPage(
        items: items
            .map((dynamic e) => DunningRun.fromJson(e as Map<String, dynamic>))
            .toList(),
        nextCursor: pageInfo?['nextCursor'] as String?,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
