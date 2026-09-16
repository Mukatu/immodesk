import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';

/// Appels HTTP bruts de `docs/api/phase8-contract.md` (§ États des lieux).
/// Séquence en ligne : création, postes, photos, puis signature — aucune
/// route unique ne couvre l'ensemble (voir `InspectionsRepositoryImpl`).
class InspectionsRemoteDataSource {
  InspectionsRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<String> createInspection(
    String organizationId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/inspections',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return (response.data as Map<String, dynamic>)['id'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<String> addItem(
    String organizationId,
    String inspectionId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/inspections/$inspectionId/items',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return (response.data as Map<String, dynamic>)['id'] as String;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<void> addPhoto(
    String organizationId,
    String inspectionId,
    String itemId,
    String documentId,
  ) async {
    try {
      await _dio.post<dynamic>(
        '/inspections/$inspectionId/items/$itemId/photos',
        data: <String, dynamic>{'documentId': documentId},
        options: _orgHeaders(organizationId),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Map<String, dynamic>> sign(
    String organizationId,
    String inspectionId,
    Map<String, dynamic> body,
  ) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/inspections/$inspectionId/sign',
        data: body,
        options: _orgHeaders(organizationId),
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
