import 'inspection_item_draft.dart';
import 'inspection_type.dart';

/// État des lieux en cours de saisie, pièce par pièce, avant soumission
/// (`docs/api/phase8-contract.md`). Le lot et le bail sont connus dès
/// l'ouverture (choisis dans la tournée du démarcheur).
class InspectionDraft {
  const InspectionDraft({
    required this.unitId,
    this.leaseId,
    this.tenantId,
    required this.inspectionType,
    this.items = const [],
    this.tenantPresent = true,
    this.absenceReason,
    this.notes,
  });

  final String unitId;
  final String? leaseId;
  final String? tenantId;
  final InspectionType inspectionType;
  final List<InspectionItemDraft> items;

  /// Si `false`, un motif d'absence est obligatoire (contrat : le statut
  /// devient `PENDING_SIGNATURE` en l'attente de la signature du locataire).
  final bool tenantPresent;
  final String? absenceReason;
  final String? notes;

  /// Pièces déjà saisies, dans l'ordre de première apparition.
  List<String> get roomLabels {
    final List<String> seen = [];
    for (final InspectionItemDraft item in items) {
      if (!seen.contains(item.roomLabel)) seen.add(item.roomLabel);
    }
    return seen;
  }

  List<InspectionItemDraft> itemsForRoom(String roomLabel) =>
      items.where((i) => i.roomLabel == roomLabel).toList();

  InspectionDraft copyWith({
    List<InspectionItemDraft>? items,
    bool? tenantPresent,
    String? absenceReason,
    bool clearAbsenceReason = false,
    String? notes,
  }) {
    return InspectionDraft(
      unitId: unitId,
      leaseId: leaseId,
      tenantId: tenantId,
      inspectionType: inspectionType,
      items: items ?? this.items,
      tenantPresent: tenantPresent ?? this.tenantPresent,
      absenceReason: clearAbsenceReason
          ? null
          : (absenceReason ?? this.absenceReason),
      notes: notes ?? this.notes,
    );
  }

  InspectionDraft addItem(InspectionItemDraft item) =>
      copyWith(items: [...items, item]);

  InspectionDraft updateItem(String localId, InspectionItemDraft updated) =>
      copyWith(
        items: items.map((i) => i.localId == localId ? updated : i).toList(),
      );

  InspectionDraft removeItem(String localId) =>
      copyWith(items: items.where((i) => i.localId != localId).toList());
}
