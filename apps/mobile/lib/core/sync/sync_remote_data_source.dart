import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../network/api_exception.dart';
import '../network/dio_provider.dart';
import 'sync_dto.dart';
import 'sync_pull_dto.dart';

part 'sync_remote_data_source.g.dart';

/// Appels HTTP bruts du protocole de synchronisation
/// (`docs/api/phase5-contract.md`). `X-Organization-Id` requis comme pour
/// tous les autres appels mobile.
class SyncRemoteDataSource {
  SyncRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<SyncBatchResult> postBatch(
    String organizationId,
    SyncBatchInput input,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/sync/batches',
        data: input.toJson(),
        options: _orgHeaders(organizationId),
      );
      return SyncBatchResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<SyncPullResult> pull(
    String organizationId, {
    String? since,
    int limit = 200,
  }) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/sync/pull',
        queryParameters: <String, dynamic>{'since': ?since, 'limit': limit},
        options: _orgHeaders(organizationId),
      );
      return SyncPullResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}

@riverpod
SyncRemoteDataSource syncRemoteDataSource(Ref ref) {
  return SyncRemoteDataSource(ref.watch(dioProvider));
}
