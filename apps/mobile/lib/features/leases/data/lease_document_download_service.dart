import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/api_exception.dart';
import '../../documents/data/documents_providers.dart';
import '../../documents/domain/entities/upload_url_result.dart';
import '../../documents/domain/repositories/documents_repository.dart';
import '../domain/entities/lease_document.dart';

part 'lease_document_download_service.g.dart';

/// Télécharge un document de bail dans le répertoire temporaire de
/// l'appareil, à partir d'une URL signée valable 10 minutes (contrat
/// `GET /documents/{id}/download-url`, `docs/api/phase1-contract.md`).
///
/// Le client `Dio` de téléchargement (sans intercepteur applicatif : l'URL
/// signée porte sa propre autorisation, comme pour
/// `DocumentsRemoteDataSource.putFile`) est injecté via [downloadDioProvider]
/// plutôt qu'instancié directement, afin de pouvoir le remplacer par un
/// mock mocktail dans les tests widget (partage/ouverture d'un document)
/// sans déclencher un vrai appel réseau.
class LeaseDocumentDownloadService {
  LeaseDocumentDownloadService(this._documentsRepository, this._downloadDio);

  final DocumentsRepository _documentsRepository;
  final Dio _downloadDio;

  Future<File> download({
    required String organizationId,
    required LeaseDocument document,
    void Function(double progress)? onProgress,
  }) async {
    final DownloadUrlResult downloadUrlResult = await _documentsRepository
        .fetchDownloadUrl(
          organizationId: organizationId,
          documentId: document.documentId,
        );
    final Directory tempDir = await getTemporaryDirectory();
    final String savePath = p.join(tempDir.path, _sanitizedFileName(document));

    try {
      await _downloadDio.download(
        downloadUrlResult.downloadUrl,
        savePath,
        onReceiveProgress: (int received, int total) {
          if (total > 0 && onProgress != null) {
            onProgress(received / total);
          }
        },
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    }
    return File(savePath);
  }

  /// Nom de fichier assaini (pas d'espaces ni de caractères spéciaux) :
  /// `contrat_v1_<id>.pdf`.
  String _sanitizedFileName(LeaseDocument document) {
    final String base =
        '${document.kind.name}_v${document.version}_${document.id}';
    final String sanitized = base.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
    return '$sanitized.pdf';
  }
}

/// Client `Dio` nu dédié au téléchargement direct depuis une URL signée
/// (pas de base URL, pas d'intercepteur d'authentification).
@riverpod
Dio downloadDio(Ref ref) => Dio();

@riverpod
LeaseDocumentDownloadService leaseDocumentDownloadService(Ref ref) {
  return LeaseDocumentDownloadService(
    ref.watch(documentsRepositoryProvider),
    ref.watch(downloadDioProvider),
  );
}
