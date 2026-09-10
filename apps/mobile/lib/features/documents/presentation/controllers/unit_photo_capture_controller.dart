import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/media/image_compressor.dart';
import '../../../../core/media/image_picker_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/ulid.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/documents_providers.dart';
import '../../data/photo_outbox_service.dart';
import '../../domain/entities/document_kind.dart';

part 'unit_photo_capture_controller.g.dart';

enum PhotoCaptureResult { cancelled, sentOnline, queuedOffline, failed }

class PhotoCaptureState {
  const PhotoCaptureState({
    this.isBusy = false,
    this.lastResult,
    this.errorMessage,
  });

  final bool isBusy;
  final PhotoCaptureResult? lastResult;
  final String? errorMessage;

  PhotoCaptureState copyWith({
    bool? isBusy,
    PhotoCaptureResult? lastResult,
    String? errorMessage,
  }) {
    return PhotoCaptureState(
      isBusy: isBusy ?? this.isBusy,
      lastResult: lastResult,
      errorMessage: errorMessage,
    );
  }
}

/// Prise de photo d'un lot : capture caméra, compression 1600 px / qualité
/// 80, puis envoi direct si le réseau est disponible, sinon mise en
/// attente locale dans l'outbox (rejouée au retour du réseau).
@riverpod
class UnitPhotoCaptureController extends _$UnitPhotoCaptureController {
  @override
  PhotoCaptureState build() => const PhotoCaptureState();

  Future<PhotoCaptureResult> capture(String unitId) async {
    state = state.copyWith(isBusy: true, errorMessage: null);
    try {
      final picker = ref.read(imagePickerServiceProvider);
      final photo = await picker.takePhoto();
      if (photo == null) {
        state = state.copyWith(
          isBusy: false,
          lastResult: PhotoCaptureResult.cancelled,
        );
        return PhotoCaptureResult.cancelled;
      }

      final compressor = ref.read(imageCompressorProvider);
      final Directory docsDir = await getApplicationDocumentsDirectory();
      final String clientRef = Ulid.generate();
      final String destinationPath = p.join(
        docsDir.path,
        'pending_photos',
        '$clientRef.jpg',
      );
      final File compressedFile = await compressor.compressFile(
        File(photo.path),
        destinationPath,
      );
      final int sizeBytes = await compressedFile.length();

      final String organizationId =
          ref.read(selectedOrganizationControllerProvider).value ?? '';

      final bool isOffline = await ref
          .read(connectivityServiceProvider)
          .isOffline();

      if (!isOffline) {
        try {
          final repository = ref.read(documentsRepositoryProvider);
          final upload = await repository.requestUploadUrl(
            organizationId: organizationId,
            fileName: '$clientRef.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: sizeBytes,
            kind: DocumentKind.propertyPhoto,
            relatedEntityType: 'unit',
            relatedEntityId: unitId,
          );
          await repository.putFile(
            uploadUrl: upload.uploadUrl,
            file: compressedFile,
            mimeType: 'image/jpeg',
          );
          await repository.registerDocument(
            organizationId: organizationId,
            objectKey: upload.objectKey,
            fileName: '$clientRef.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: sizeBytes,
            kind: DocumentKind.propertyPhoto,
            relatedEntityType: 'unit',
            relatedEntityId: unitId,
            clientRef: clientRef,
          );
          state = state.copyWith(
            isBusy: false,
            lastResult: PhotoCaptureResult.sentOnline,
          );
          return PhotoCaptureResult.sentOnline;
        } on ApiException {
          // Réseau instable malgré la détection : on bascule en file
          // d'attente locale plutôt que de perdre la photo.
        }
      }

      final outbox = ref.read(photoOutboxServiceProvider);
      await outbox.enqueue(
        organizationId: organizationId,
        unitId: unitId,
        filePath: compressedFile.path,
        fileName: '$clientRef.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: sizeBytes,
      );
      state = state.copyWith(
        isBusy: false,
        lastResult: PhotoCaptureResult.queuedOffline,
      );
      return PhotoCaptureResult.queuedOffline;
    } catch (e) {
      state = state.copyWith(
        isBusy: false,
        lastResult: PhotoCaptureResult.failed,
        errorMessage: e.toString(),
      );
      return PhotoCaptureResult.failed;
    }
  }
}
