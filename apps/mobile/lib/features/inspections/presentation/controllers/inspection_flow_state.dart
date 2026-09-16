import 'dart:typed_data';

import '../../domain/entities/inspection_draft.dart';
import '../../domain/entities/inspection_submit_result.dart';
import '../../domain/inspection_validation.dart';

/// État de la saisie d'un état des lieux en cours : brouillon local, avancé
/// pièce par pièce, jusqu'à la signature.
class InspectionFlowState {
  const InspectionFlowState({
    required this.draft,
    required this.clientRef,
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
    this.queuedOffline = false,
    this.tenantSignaturePngBytes,
    this.agentSignaturePngBytes,
  });

  final InspectionDraft draft;
  final Uint8List? tenantSignaturePngBytes;
  final Uint8List? agentSignaturePngBytes;

  /// Généré une seule fois à l'ouverture, conservé jusqu'à la réponse (ou la
  /// mise en attente hors ligne) — idempotence comme l'encaissement.
  final String clientRef;
  final bool isSubmitting;
  final String? errorMessage;
  final InspectionSubmitResult? result;
  final bool queuedOffline;

  InspectionSignReadiness get readiness => checkInspectionSignReadiness(draft);

  /// Signatures capturées en plus des postes/photos : l'agence est toujours
  /// requise, le locataire seulement s'il est présent.
  bool get hasRequiredSignatures =>
      agentSignaturePngBytes != null &&
      (!draft.tenantPresent || tenantSignaturePngBytes != null);

  bool get canSubmit => readiness.canSign && hasRequiredSignatures;

  InspectionFlowState copyWith({
    InspectionDraft? draft,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    InspectionSubmitResult? result,
    bool? queuedOffline,
    Uint8List? tenantSignaturePngBytes,
    Uint8List? agentSignaturePngBytes,
  }) {
    return InspectionFlowState(
      draft: draft ?? this.draft,
      clientRef: clientRef,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
      queuedOffline: queuedOffline ?? this.queuedOffline,
      tenantSignaturePngBytes:
          tenantSignaturePngBytes ?? this.tenantSignaturePngBytes,
      agentSignaturePngBytes:
          agentSignaturePngBytes ?? this.agentSignaturePngBytes,
    );
  }
}
