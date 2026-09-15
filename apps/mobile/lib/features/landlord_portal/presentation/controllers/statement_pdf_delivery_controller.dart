import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/network/api_exception.dart';
import '../../../leases/data/lease_document_download_service.dart';
import '../../data/landlord_portal_providers.dart';

part 'statement_pdf_delivery_controller.g.dart';

enum StatementPdfStatus { idle, downloading, sharing, success, error }

class StatementPdfState {
  const StatementPdfState({
    this.status = StatementPdfStatus.idle,
    this.errorMessage,
  });

  final StatementPdfStatus status;
  final String? errorMessage;

  StatementPdfState copyWith({
    StatementPdfStatus? status,
    String? errorMessage,
  }) {
    return StatementPdfState(
      status: status ?? this.status,
      errorMessage: errorMessage,
    );
  }
}

/// Téléchargement puis partage du PDF d'un relevé de gérance
/// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
/// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
/// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
/// (le portail bailleur n'y a pas accès).
@riverpod
class StatementPdfDeliveryController extends _$StatementPdfDeliveryController {
  @override
  StatementPdfState build(String statementId) => const StatementPdfState();

  Future<void> downloadAndShare() async {
    state = state.copyWith(status: StatementPdfStatus.downloading);
    try {
      final String downloadUrl = await ref
          .read(landlordPortalRepositoryProvider)
          .fetchStatementPdfUrl(statementId);
      final Directory tempDir = await getTemporaryDirectory();
      final String savePath = p.join(tempDir.path, 'releve_$statementId.pdf');
      await ref.read(downloadDioProvider).download(downloadUrl, savePath);
      state = state.copyWith(status: StatementPdfStatus.sharing);
      await SharePlus.instance.share(
        ShareParams(files: [XFile(savePath)], text: 'Relevé de gérance'),
      );
      state = state.copyWith(status: StatementPdfStatus.success);
    } on ApiException catch (e) {
      state = state.copyWith(
        status: StatementPdfStatus.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: StatementPdfStatus.error,
        errorMessage: 'Partage impossible : $e',
      );
    }
  }
}
