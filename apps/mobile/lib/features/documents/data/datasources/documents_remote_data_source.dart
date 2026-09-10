import 'dart:io';

import 'package:dio/dio.dart';

import '../../../../core/network/api_exception.dart';
import '../../domain/entities/document.dart';
import '../../domain/entities/document_kind.dart';
import '../../domain/entities/upload_url_result.dart';

/// Appels HTTP bruts pour les documents. Le client [_dio] applicatif porte
/// déjà l'en-tête `Authorization` (intercepteur) ; `X-Organization-Id` est
/// ajouté explicitement à chaque appel (aucun endpoint phase 1 n'est
/// accessible sans organisation active).
class DocumentsRemoteDataSource {
  DocumentsRemoteDataSource(this._dio);

  final Dio _dio;

  Options _orgHeaders(String organizationId) =>
      Options(headers: <String, String>{'X-Organization-Id': organizationId});

  Future<UploadUrlResult> requestUploadUrl({
    required String organizationId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required DocumentKind kind,
    String? relatedEntityType,
    String? relatedEntityId,
  }) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/documents/upload-url',
        data: <String, dynamic>{
          'fileName': fileName,
          'mimeType': mimeType,
          'sizeBytes': sizeBytes,
          'kind': kind.apiValue,
          'relatedEntityType': ?relatedEntityType,
          'relatedEntityId': ?relatedEntityId,
        },
        options: _orgHeaders(organizationId),
      );
      return UploadUrlResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  /// PUT direct vers l'URL signée, sans les en-têtes applicatifs.
  Future<void> putFile({
    required String uploadUrl,
    required File file,
    required String mimeType,
  }) async {
    try {
      final Dio plainDio = Dio();
      await plainDio.put<dynamic>(
        uploadUrl,
        data: file.openRead(),
        options: Options(
          headers: <String, dynamic>{
            'Content-Type': mimeType,
            'Content-Length': await file.length(),
          },
        ),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<Document> registerDocument({
    required String organizationId,
    required String objectKey,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required DocumentKind kind,
    String? relatedEntityType,
    String? relatedEntityId,
    String? clientRef,
  }) async {
    try {
      final Response<dynamic> response = await _dio.post<dynamic>(
        '/documents',
        data: <String, dynamic>{
          'objectKey': objectKey,
          'fileName': fileName,
          'mimeType': mimeType,
          'sizeBytes': sizeBytes,
          'kind': kind.apiValue,
          'relatedEntityType': ?relatedEntityType,
          'relatedEntityId': ?relatedEntityId,
          'clientRef': ?clientRef,
        },
        options: _orgHeaders(organizationId),
      );
      return Document.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<List<Document>> fetchDocuments({
    required String organizationId,
    String? relatedEntityType,
    String? relatedEntityId,
    DocumentKind? kind,
  }) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/documents',
        queryParameters: <String, dynamic>{
          'relatedEntityType': ?relatedEntityType,
          'relatedEntityId': ?relatedEntityId,
          'kind': ?kind?.apiValue,
        },
        options: _orgHeaders(organizationId),
      );
      final Map<String, dynamic> data = response.data as Map<String, dynamic>;
      final List<dynamic> items = data['items'] as List<dynamic>? ?? const [];
      return items
          .map((dynamic e) => Document.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }

  Future<DownloadUrlResult> fetchDownloadUrl({
    required String organizationId,
    required String documentId,
  }) async {
    try {
      final Response<dynamic> response = await _dio.get<dynamic>(
        '/documents/$documentId/download-url',
        options: _orgHeaders(organizationId),
      );
      return DownloadUrlResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
  }
}
