import 'dart:io';
import 'dart:typed_data';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/outbox_repository.dart';
import '../../../../core/sync/outbox_types.dart';
import '../../../../core/sync/sync_providers.dart';
import '../../../../core/sync/ulid.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/inspections_providers.dart';
import '../../domain/entities/inspection_draft.dart';
import '../../domain/entities/inspection_item_draft.dart';
import '../../domain/entities/inspection_type.dart';
import '../../domain/inspection_offline_plan.dart';
import 'inspection_flow_state.dart';

part 'inspection_flow_controller.g.dart';

/// Pilote la saisie d'un état des lieux pièce par pièce jusqu'à sa
/// soumission (en ligne, séquence de routes réelles ; hors ligne, une seule
/// opération `INSPECTION_SUBMIT` dans l'outbox — voir
/// `docs/api/phase5-contract.md` et `InspectionOfflinePlan`).
@Riverpod(keepAlive: true)
class InspectionFlowController extends _$InspectionFlowController {
  @override
  InspectionFlowState? build() => null;

  void start({
    required String unitId,
    String? leaseId,
    String? tenantId,
    required InspectionType inspectionType,
  }) {
    state = InspectionFlowState(
      draft: InspectionDraft(
        unitId: unitId,
        leaseId: leaseId,
        tenantId: tenantId,
        inspectionType: inspectionType,
      ),
      clientRef: Ulid.generate(),
    );
  }

  void clear() => state = null;

  void setTenantPresent(bool present) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(
      draft: current.draft.copyWith(
        tenantPresent: present,
        clearAbsenceReason: present,
      ),
    );
  }

  void setAbsenceReason(String reason) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(
      draft: current.draft.copyWith(absenceReason: reason),
    );
  }

  void addItem(InspectionItemDraft item) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(draft: current.draft.addItem(item));
  }

  void updateItem(String localId, InspectionItemDraft updated) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(draft: current.draft.updateItem(localId, updated));
  }

  void removeItem(String localId) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(draft: current.draft.removeItem(localId));
  }

  void setTenantSignature(Uint8List pngBytes) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(tenantSignaturePngBytes: pngBytes);
  }

  void setAgentSignature(Uint8List pngBytes) {
    final InspectionFlowState? current = state;
    if (current == null) return;
    state = current.copyWith(agentSignaturePngBytes: pngBytes);
  }

  /// Soumet l'état des lieux. Verrouillé dès le premier appui, comme
  /// l'encaissement. Refuse si [InspectionFlowState.canSubmit] ne l'autorise
  /// pas (postes/photos incomplets ou signature manquante) — l'écran doit
  /// vérifier avant d'appeler cette méthode.
  Future<void> submit() async {
    final InspectionFlowState? current = state;
    if (current == null || current.isSubmitting || !current.canSubmit) {
      return;
    }
    final Uint8List? tenantSignaturePngBytes = current.tenantSignaturePngBytes;
    final Uint8List agentSignaturePngBytes = current.agentSignaturePngBytes!;
    state = current.copyWith(isSubmitting: true, clearError: true);

    // `.future` (et non `.value`) : ce contrôleur peut être le tout premier
    // lecteur de l'organisation sélectionnée (aucun écran de la
    // fonctionnalité ne la lit avant la signature) — lire `.value`
    // renverrait `null` tant que le fournisseur async n'a pas eu l'occasion
    // de se résoudre, comme `EncaissementController.build`.
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
      await _submitOffline(
        organizationId,
        current,
        tenantSignaturePngBytes,
        agentSignaturePngBytes,
      );
      return;
    }

    try {
      final result = await ref
          .read(inspectionsRepositoryProvider)
          .submitOnline(
            organizationId: organizationId,
            draft: current.draft,
            clientRef: current.clientRef,
            tenantSignaturePngBytes: tenantSignaturePngBytes,
            agentSignaturePngBytes: agentSignaturePngBytes,
          );
      state = current.copyWith(isSubmitting: false, result: result);
    } on ApiException catch (e) {
      state = current.copyWith(isSubmitting: false, errorMessage: e.message);
    }
  }

  Future<String> _writeTempPng(Uint8List bytes, String fileName) async {
    final Directory docsDir = await getApplicationDocumentsDirectory();
    final String path = p.join(docsDir.path, 'pending_signatures', fileName);
    final File file = File(path);
    await file.create(recursive: true);
    await file.writeAsBytes(bytes);
    return path;
  }

  Future<void> _submitOffline(
    String organizationId,
    InspectionFlowState current,
    Uint8List? tenantSignaturePngBytes,
    Uint8List agentSignaturePngBytes,
  ) async {
    final String agentPath = await _writeTempPng(
      agentSignaturePngBytes,
      'agent_${current.clientRef}.png',
    );
    final String? tenantPath = tenantSignaturePngBytes == null
        ? null
        : await _writeTempPng(
            tenantSignaturePngBytes,
            'locataire_${current.clientRef}.png',
          );

    final InspectionOfflinePlan plan = buildInspectionOfflinePlan(
      draft: current.draft,
      clientRef: current.clientRef,
      tenantSignaturePath: tenantPath,
      agentSignaturePath: agentPath,
    );

    final OutboxRepository outboxRepository = ref.read(
      outboxRepositoryProvider,
    );
    final Map<String, String> fieldPaths = {};
    final List<String> dependsOn = [];
    for (final doc in plan.pendingDocuments) {
      final File file = File(doc.filePath);
      final int sizeBytes = await file.length();
      final String docRef = await outboxRepository.enqueue(
        organizationId: organizationId,
        type: OutboxOperationType.document,
        payload: <String, dynamic>{
          'filePath': doc.filePath,
          'fileName': p.basename(doc.filePath),
          'mimeType': doc.filePath.endsWith('.png')
              ? 'image/png'
              : 'image/jpeg',
          'sizeBytes': sizeBytes,
        },
      );
      dependsOn.add(docRef);
      fieldPaths[docRef] = doc.fieldPath;
    }

    final Map<String, dynamic> payload = {
      ...plan.payload,
      '_documentFieldPaths': fieldPaths,
    };

    await outboxRepository.enqueue(
      organizationId: organizationId,
      type: OutboxOperationType.inspectionSubmit,
      clientRef: current.clientRef,
      dependsOn: dependsOn,
      payload: payload,
    );
    state = current.copyWith(isSubmitting: false, queuedOffline: true);
    ref.read(syncCoordinatorProvider.notifier).triggerSync();
  }
}
