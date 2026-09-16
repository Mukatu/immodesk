import 'dart:typed_data';

import '../entities/inspection_draft.dart';
import '../entities/inspection_submit_result.dart';

/// Soumission en ligne d'un état des lieux complet. Le mode hors ligne
/// n'emprunte pas ce port : il enqueue une seule opération `INSPECTION_SUBMIT`
/// dans l'outbox généralisée (voir `InspectionSignatureController`),
/// conformément à `docs/api/phase5-contract.md`.
abstract interface class InspectionsRepository {
  Future<InspectionSubmitResult> submitOnline({
    required String organizationId,
    required InspectionDraft draft,
    required String clientRef,
    Uint8List? tenantSignaturePngBytes,
    required Uint8List agentSignaturePngBytes,
  });
}
