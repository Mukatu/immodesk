import 'dart:io';

import '../entities/document.dart';
import '../entities/document_kind.dart';
import '../entities/upload_url_result.dart';

/// Port d'accès aux documents/photos (`docs/api/phase1-contract.md`,
/// section documents) : demande d'URL signée, envoi direct au stockage,
/// enregistrement, consultation.
abstract interface class DocumentsRepository {
  Future<UploadUrlResult> requestUploadUrl({
    required String organizationId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    required DocumentKind kind,
    String? relatedEntityType,
    String? relatedEntityId,
  });

  /// Envoi direct (PUT) du fichier compressé vers l'URL signée. N'utilise
  /// pas le client dio applicatif : l'URL signée porte sa propre
  /// autorisation, elle ne doit recevoir ni `Authorization` ni
  /// `X-Organization-Id`.
  Future<void> putFile({
    required String uploadUrl,
    required File file,
    required String mimeType,
  });

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
  });

  Future<List<Document>> fetchDocuments({
    required String organizationId,
    String? relatedEntityType,
    String? relatedEntityId,
    DocumentKind? kind,
  });

  Future<DownloadUrlResult> fetchDownloadUrl({
    required String organizationId,
    required String documentId,
  });
}
