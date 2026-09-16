import 'entities/charged_to.dart';
import 'entities/inspection_condition.dart';
import 'entities/inspection_draft.dart';
import 'entities/inspection_item_draft.dart';
import 'entities/inspection_type.dart';

/// Une pièce jointe locale encore à téléverser, et le chemin (voir
/// `document_field_paths.dart`) où inscrire son `documentId` une fois
/// résolu.
class PendingInspectionDocument {
  const PendingInspectionDocument({
    required this.filePath,
    required this.fieldPath,
  });

  final String filePath;
  final String fieldPath;
}

/// Plan de dépôt hors ligne : le `payload` de l'opération `INSPECTION_SUBMIT`
/// (signatures et photos encore à `null`) et la liste des pièces jointes à
/// enqueue séparément (`DOCUMENT`), dans l'ordre. Fonction pure — aucune
/// écriture disque ni réseau — pour rester testable unitairement.
class InspectionOfflinePlan {
  const InspectionOfflinePlan({
    required this.payload,
    required this.pendingDocuments,
  });

  final Map<String, dynamic> payload;
  final List<PendingInspectionDocument> pendingDocuments;
}

InspectionOfflinePlan buildInspectionOfflinePlan({
  required InspectionDraft draft,
  required String clientRef,
  String? tenantSignaturePath,
  required String agentSignaturePath,
}) {
  final List<PendingInspectionDocument> pending = [
    PendingInspectionDocument(
      filePath: agentSignaturePath,
      fieldPath: 'agentSignatureDocumentId',
    ),
    if (tenantSignaturePath != null)
      PendingInspectionDocument(
        filePath: tenantSignaturePath,
        fieldPath: 'tenantSignatureDocumentId',
      ),
  ];

  final List<Map<String, dynamic>> items = [];
  for (int i = 0; i < draft.items.length; i++) {
    final InspectionItemDraft item = draft.items[i];
    final List<dynamic> photoIds = List<dynamic>.filled(
      item.photoPaths.length,
      null,
    );
    for (int j = 0; j < item.photoPaths.length; j++) {
      pending.add(
        PendingInspectionDocument(
          filePath: item.photoPaths[j],
          fieldPath: 'items.$i.photoDocumentIds.$j',
        ),
      );
    }
    items.add(<String, dynamic>{
      'roomLabel': item.roomLabel,
      'elementLabel': item.elementLabel,
      'elementCategory': ?item.elementCategory,
      'condition': item.condition.apiValue,
      'isDamaged': item.condition.requiresPhoto,
      'damageDescription': ?item.damageDescription,
      'repairAmount': ?item.repairAmount,
      'chargedTo': ?item.chargedTo?.apiValue,
      'photoDocumentIds': photoIds,
    });
  }

  final Map<String, dynamic> payload = <String, dynamic>{
    'unitId': draft.unitId,
    'leaseId': ?draft.leaseId,
    'tenantId': ?draft.tenantId,
    'inspectionType': draft.inspectionType.apiValue,
    'tenantPresent': draft.tenantPresent,
    'absenceReason': ?draft.absenceReason,
    'notes': ?draft.notes,
    'clientRef': clientRef,
    'tenantSignatureDocumentId': null,
    'agentSignatureDocumentId': null,
    'items': items,
  };

  return InspectionOfflinePlan(payload: payload, pendingDocuments: pending);
}
