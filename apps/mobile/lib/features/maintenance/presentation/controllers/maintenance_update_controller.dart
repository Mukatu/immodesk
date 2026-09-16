import 'dart:io';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/outbox_repository.dart';
import '../../../../core/sync/outbox_types.dart';
import '../../../../core/sync/sync_providers.dart';
import '../../../../core/sync/ulid.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/maintenance_providers.dart';
import '../../domain/entities/maintenance_status.dart';
import 'maintenance_update_state.dart';

part 'maintenance_update_controller.g.dart';

/// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
/// commentaire, changement de statut, photo — en ligne ou hors ligne
/// (`MAINTENANCE_UPDATE`, comme l'encaissement).
@riverpod
class MaintenanceUpdateController extends _$MaintenanceUpdateController {
  @override
  MaintenanceUpdateState build(String requestId) {
    return MaintenanceUpdateState(
      requestId: requestId,
      clientRef: Ulid.generate(),
    );
  }

  void setStatus(MaintenanceStatus? status) {
    state = state.copyWith(newStatus: status);
  }

  void setMessage(String message) {
    state = state.copyWith(message: message, clearError: true);
  }

  void setPhotoPath(String path) {
    state = state.copyWith(photoPath: path);
  }

  Future<void> submit() async {
    if (!state.canSubmit) return;
    final MaintenanceUpdateState current = state;
    state = state.copyWith(isSubmitting: true, clearError: true);

    final String? organizationId = await ref.read(
      selectedOrganizationControllerProvider.future,
    );
    if (organizationId == null) {
      state = current.copyWith(
        isSubmitting: false,
        errorMessage: 'Organisation introuvable.',
      );
      return;
    }

    final bool offline = await ref
        .read(connectivityServiceProvider)
        .isOffline();
    if (offline) {
      await _submitOffline(organizationId, current);
      return;
    }

    try {
      await ref
          .read(maintenanceRepositoryProvider)
          .postUpdate(
            organizationId: organizationId,
            id: requestId,
            newStatus: current.newStatus?.apiValue,
            message: current.message.trim().isEmpty
                ? null
                : current.message.trim(),
            clientRef: current.clientRef,
          );
      state = current.copyWith(isSubmitting: false, success: true);
    } on ApiException catch (e) {
      state = current.copyWith(isSubmitting: false, errorMessage: e.message);
    }
  }

  Future<void> _submitOffline(
    String organizationId,
    MaintenanceUpdateState current,
  ) async {
    final OutboxRepository outboxRepository = ref.read(
      outboxRepositoryProvider,
    );
    List<String> dependsOn = const [];
    final Map<String, dynamic> payload = <String, dynamic>{
      'newStatus': ?current.newStatus?.apiValue,
      'message': current.message.trim().isEmpty ? null : current.message.trim(),
      'photoDocumentId': null,
      'clientRef': current.clientRef,
      'requestId': requestId,
    };
    if (current.photoPath != null) {
      final File file = File(current.photoPath!);
      final int sizeBytes = await file.length();
      final String docRef = await outboxRepository.enqueue(
        organizationId: organizationId,
        type: OutboxOperationType.document,
        payload: <String, dynamic>{
          'filePath': current.photoPath,
          'fileName': 'maintenance_${current.clientRef}.jpg',
          'mimeType': 'image/jpeg',
          'sizeBytes': sizeBytes,
        },
      );
      dependsOn = [docRef];
      payload['_documentFieldPaths'] = {docRef: 'photoDocumentId'};
    }

    await outboxRepository.enqueue(
      organizationId: organizationId,
      type: OutboxOperationType.maintenanceUpdate,
      clientRef: current.clientRef,
      dependsOn: dependsOn,
      payload: payload,
    );
    state = current.copyWith(isSubmitting: false, queuedOffline: true);
    ref.read(syncCoordinatorProvider.notifier).triggerSync();
  }
}
