import 'dart:io';

import '../../domain/entities/document.dart';
import '../../domain/entities/document_kind.dart';
import '../../domain/entities/upload_url_result.dart';
import '../../domain/repositories/documents_repository.dart';
import '../datasources/documents_remote_data_source.dart';

class DocumentsRepositoryImpl implements DocumentsRepository {
  DocumentsRepositoryImpl(this._remote);

  final DocumentsRemoteDataSource _remote;

  @override
  Future<UploadUrlResult> requestUploadUrl({
    required String organizationId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required DocumentKind kind,
    String? relatedEntityType,
    String? relatedEntityId,
  }) {
    return _remote.requestUploadUrl(
      organizationId: organizationId,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      kind: kind,
      relatedEntityType: relatedEntityType,
      relatedEntityId: relatedEntityId,
    );
  }

  @override
  Future<void> putFile({
    required String uploadUrl,
    required File file,
    required String mimeType,
  }) {
    return _remote.putFile(
      uploadUrl: uploadUrl,
      file: file,
      mimeType: mimeType,
    );
  }

  @override
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
  }) {
    return _remote.registerDocument(
      organizationId: organizationId,
      objectKey: objectKey,
      fileName: fileName,
      mimeType: mimeType,
      sizeBytes: sizeBytes,
      kind: kind,
      relatedEntityType: relatedEntityType,
      relatedEntityId: relatedEntityId,
      clientRef: clientRef,
    );
  }

  @override
  Future<List<Document>> fetchDocuments({
    required String organizationId,
    String? relatedEntityType,
    String? relatedEntityId,
    DocumentKind? kind,
  }) {
    return _remote.fetchDocuments(
      organizationId: organizationId,
      relatedEntityType: relatedEntityType,
      relatedEntityId: relatedEntityId,
      kind: kind,
    );
  }

  @override
  Future<DownloadUrlResult> fetchDownloadUrl({
    required String organizationId,
    required String documentId,
  }) {
    return _remote.fetchDownloadUrl(
      organizationId: organizationId,
      documentId: documentId,
    );
  }
}
