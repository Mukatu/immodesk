import 'dart:io';

import 'package:open_filex/open_filex.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/lease_document_download_service.dart';
import '../../domain/entities/lease_document.dart';

part 'lease_document_action_controller.g.dart';

/// Étapes du téléchargement/partage/ouverture d'un document de bail.
enum LeaseDocumentActionStatus {
  idle,
  downloading,
  readyToOpen,
  sharing,
  success,
  error,
}

const String offlineDownloadMessage =
    'Téléchargement impossible hors connexion.';

class LeaseDocumentActionState {
  const LeaseDocumentActionState({
    this.status = LeaseDocumentActionStatus.idle,
    this.progress = 0,
    this.file,
    this.errorMessage,
  });

  final LeaseDocumentActionStatus status;
  final double progress;
  final File? file;
  final String? errorMessage;

  LeaseDocumentActionState copyWith({
    LeaseDocumentActionStatus? status,
    double? progress,
    File? file,
    String? errorMessage,
  }) {
    return LeaseDocumentActionState(
      status: status ?? this.status,
      progress: progress ?? this.progress,
      file: file ?? this.file,
      errorMessage: errorMessage,
    );
  }
}

/// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
/// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
/// par document (`documentAssociationId` = `LeaseDocument.id`).
@riverpod
class LeaseDocumentActionController extends _$LeaseDocumentActionController {
  @override
  LeaseDocumentActionState build(String documentAssociationId) {
    return const LeaseDocumentActionState();
  }

  Future<void> share(LeaseDocument document) async {
    final File? file = await _ensureDownloaded(document);
    if (file == null) return;
    state = state.copyWith(status: LeaseDocumentActionStatus.sharing);
    try {
      await SharePlus.instance.share(
        ShareParams(files: [XFile(file.path)], text: document.title),
      );
      state = state.copyWith(status: LeaseDocumentActionStatus.success);
    } catch (e) {
      state = state.copyWith(
        status: LeaseDocumentActionStatus.error,
        errorMessage: 'Partage impossible : $e',
      );
    }
  }

  Future<void> open(LeaseDocument document) async {
    final File? file = await _ensureDownloaded(document);
    if (file == null) return;
    final OpenResult result = await OpenFilex.open(file.path);
    if (result.type != ResultType.done) {
      state = state.copyWith(
        status: LeaseDocumentActionStatus.error,
        errorMessage: "Impossible d'ouvrir le document : ${result.message}",
      );
      return;
    }
    state = state.copyWith(status: LeaseDocumentActionStatus.success);
  }

  Future<File?> _ensureDownloaded(LeaseDocument document) async {
    final File? existing = state.file;
    if (existing != null && existing.existsSync()) {
      return existing;
    }

    final bool isOffline = await ref
        .read(connectivityServiceProvider)
        .isOffline();
    if (isOffline) {
      state = state.copyWith(
        status: LeaseDocumentActionStatus.error,
        errorMessage: offlineDownloadMessage,
      );
      return null;
    }

    state = state.copyWith(
      status: LeaseDocumentActionStatus.downloading,
      progress: 0,
    );
    try {
      final String organizationId =
          ref.read(selectedOrganizationControllerProvider).value ?? '';
      final File file = await ref
          .read(leaseDocumentDownloadServiceProvider)
          .download(
            organizationId: organizationId,
            document: document,
            onProgress: (double progress) {
              state = state.copyWith(
                status: LeaseDocumentActionStatus.downloading,
                progress: progress,
              );
            },
          );
      state = state.copyWith(
        status: LeaseDocumentActionStatus.readyToOpen,
        progress: 1,
        file: file,
      );
      return file;
    } on ApiException catch (e) {
      state = state.copyWith(
        status: LeaseDocumentActionStatus.error,
        errorMessage: e.message,
      );
      return null;
    } catch (e) {
      state = state.copyWith(
        status: LeaseDocumentActionStatus.error,
        errorMessage: 'Téléchargement impossible : $e',
      );
      return null;
    }
  }
}
