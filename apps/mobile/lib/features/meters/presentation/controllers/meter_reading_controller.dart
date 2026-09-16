import 'dart:io';

import 'package:intl/intl.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/outbox_repository.dart';
import '../../../../core/sync/outbox_types.dart';
import '../../../../core/sync/sync_providers.dart';
import '../../../../core/sync/ulid.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/meters_providers.dart';
import '../../domain/entities/meter.dart';
import 'meter_reading_state.dart';

part 'meter_reading_controller.g.dart';

/// Pilote la saisie d'un relevé pour un compteur. Un seul relevé en cours à
/// la fois (`start` réinitialise), comme l'état des lieux.
@Riverpod(keepAlive: true)
class MeterReadingController extends _$MeterReadingController {
  @override
  MeterReadingState? build() => null;

  void start(Meter meter) {
    state = MeterReadingState(meter: meter, clientRef: Ulid.generate());
  }

  void clear() => state = null;

  void setIndexInput(int? value) {
    final MeterReadingState? current = state;
    if (current == null) return;
    state = current.copyWith(
      currentIndexInput: value,
      clearCurrentIndexInput: value == null,
      rolloverApplied: false,
      clearError: true,
    );
  }

  /// Confirme explicitement un passage par zéro : le démarcheur distingue
  /// ainsi l'anomalie réelle d'une simple erreur de saisie
  /// (`docs/api/phase8-contract.md`, arbitrage 1).
  void confirmRollover() {
    final MeterReadingState? current = state;
    if (current == null) return;
    state = current.copyWith(rolloverApplied: true);
  }

  void setPhotoPath(String path) {
    final MeterReadingState? current = state;
    if (current == null) return;
    state = current.copyWith(photoPath: path);
  }

  Future<void> submit() async {
    final MeterReadingState? current = state;
    if (current == null || !current.canSubmit) return;
    state = current.copyWith(isSubmitting: true, clearError: true);

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
    final String readingDate = DateFormat('yyyy-MM-dd').format(DateTime.now());

    final bool offline = await ref
        .read(connectivityServiceProvider)
        .isOffline();
    if (offline) {
      await _submitOffline(organizationId, current, readingDate);
      return;
    }

    try {
      final result = await ref
          .read(metersRepositoryProvider)
          .createReading(
            organizationId: organizationId,
            meterId: current.meter.id,
            readingDate: readingDate,
            currentIndex: current.currentIndexInput!,
            rolloverApplied: current.rolloverApplied,
            clientRef: current.clientRef,
          );
      state = current.copyWith(isSubmitting: false, result: result);
    } on ApiException catch (e) {
      state = current.copyWith(isSubmitting: false, errorMessage: e.message);
    }
  }

  Future<void> _submitOffline(
    String organizationId,
    MeterReadingState current,
    String readingDate,
  ) async {
    final OutboxRepository outboxRepository = ref.read(
      outboxRepositoryProvider,
    );
    List<String> dependsOn = const [];
    final Map<String, dynamic> payload = <String, dynamic>{
      'readingDate': readingDate,
      'currentIndex': current.currentIndexInput,
      'rolloverApplied': current.rolloverApplied,
      'isEstimated': false,
      'photoDocumentId': null,
      'notes': null,
      'clientRef': current.clientRef,
      'meterId': current.meter.id,
    };
    if (current.photoPath != null) {
      final File file = File(current.photoPath!);
      final int sizeBytes = await file.length();
      final String docRef = await outboxRepository.enqueue(
        organizationId: organizationId,
        type: OutboxOperationType.document,
        payload: <String, dynamic>{
          'filePath': current.photoPath,
          'fileName': 'compteur_${current.clientRef}.jpg',
          'mimeType': 'image/jpeg',
          'sizeBytes': sizeBytes,
        },
      );
      dependsOn = [docRef];
      payload['_documentFieldPaths'] = {docRef: 'photoDocumentId'};
    }

    await outboxRepository.enqueue(
      organizationId: organizationId,
      type: OutboxOperationType.meterReading,
      clientRef: current.clientRef,
      dependsOn: dependsOn,
      payload: payload,
    );
    state = current.copyWith(isSubmitting: false, queuedOffline: true);
    ref.read(syncCoordinatorProvider.notifier).triggerSync();
  }
}
