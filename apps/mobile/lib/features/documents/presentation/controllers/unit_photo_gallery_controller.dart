import 'dart:convert';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/documents_providers.dart';
import '../../data/photo_outbox_service.dart';
import '../../domain/entities/document_kind.dart';

part 'unit_photo_gallery_controller.g.dart';

/// Une photo affichée dans la galerie d'un lot : soit déjà envoyée (URL de
/// téléchargement signée), soit encore en attente d'envoi (fichier local,
/// prise hors ligne).
class UnitPhotoItem {
  const UnitPhotoItem({
    required this.id,
    this.downloadUrl,
    this.localFilePath,
    required this.isPending,
  });

  final String id;
  final String? downloadUrl;
  final String? localFilePath;
  final bool isPending;
}

class UnitPhotoGalleryState {
  const UnitPhotoGalleryState({this.items = const [], this.isOffline = false});

  final List<UnitPhotoItem> items;
  final bool isOffline;
}

/// Galerie des photos d'un lot (`GET /v1/documents` + `.../download-url`),
/// complétée par les photos encore en attente d'envoi dans l'outbox.
@riverpod
class UnitPhotoGalleryController extends _$UnitPhotoGalleryController {
  @override
  Future<UnitPhotoGalleryState> build(String unitId) async {
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final List<UnitPhotoItem> pending =
        (await ref.watch(photoOutboxServiceProvider).pendingForUnit(unitId))
            .map(
              (row) => UnitPhotoItem(
                id: row.clientRef,
                localFilePath: _extractFilePath(row.payload),
                isPending: true,
              ),
            )
            .toList();

    if (organizationId.isEmpty) {
      return UnitPhotoGalleryState(items: pending, isOffline: true);
    }

    try {
      final repository = ref.watch(documentsRepositoryProvider);
      final documents = await repository.fetchDocuments(
        organizationId: organizationId,
        relatedEntityType: 'unit',
        relatedEntityId: unitId,
        kind: DocumentKind.propertyPhoto,
      );
      final List<UnitPhotoItem> sent = [];
      for (final document in documents) {
        final download = await repository.fetchDownloadUrl(
          organizationId: organizationId,
          documentId: document.id,
        );
        sent.add(
          UnitPhotoItem(
            id: document.id,
            downloadUrl: download.downloadUrl,
            isPending: false,
          ),
        );
      }
      return UnitPhotoGalleryState(items: [...pending, ...sent]);
    } on ApiException {
      return UnitPhotoGalleryState(items: pending, isOffline: true);
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  String? _extractFilePath(String payloadJson) {
    final Map<String, dynamic> payload =
        jsonDecode(payloadJson) as Map<String, dynamic>;
    return payload['filePath'] as String?;
  }
}
