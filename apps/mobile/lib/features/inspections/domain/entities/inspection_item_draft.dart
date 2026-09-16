import 'charged_to.dart';
import 'inspection_condition.dart';

/// Poste d'état des lieux saisi localement (pièce, élément, état constaté,
/// dégradation, photos). Capturé en mémoire pendant la tournée
/// pièce par pièce, soumis en bloc à la signature (`InspectionDraft`) —
/// aucune route en ligne unique n'existe pour un poste isolé avant cette
/// étape (`docs/api/phase8-contract.md`).
class InspectionItemDraft {
  const InspectionItemDraft({
    required this.localId,
    required this.roomLabel,
    required this.elementLabel,
    this.elementCategory,
    required this.condition,
    this.damageDescription,
    this.repairAmount,
    this.chargedTo,
    this.photoPaths = const [],
  });

  /// Identifiant purement local (ULID), pour la liste/édition à l'écran —
  /// jamais transmis tel quel au serveur.
  final String localId;
  final String roomLabel;
  final String elementLabel;
  final String? elementCategory;
  final InspectionCondition condition;
  final String? damageDescription;
  final int? repairAmount;
  final ChargedTo? chargedTo;

  /// Chemins de fichiers compressés localement (`ImageCompressor`), dans
  /// l'ordre de capture.
  final List<String> photoPaths;

  bool get requiresPhoto => condition.requiresPhoto;

  bool get hasRequiredPhoto => !requiresPhoto || photoPaths.isNotEmpty;

  InspectionItemDraft copyWith({
    String? roomLabel,
    String? elementLabel,
    String? elementCategory,
    InspectionCondition? condition,
    String? damageDescription,
    bool clearDamageDescription = false,
    int? repairAmount,
    bool clearRepairAmount = false,
    ChargedTo? chargedTo,
    List<String>? photoPaths,
  }) {
    return InspectionItemDraft(
      localId: localId,
      roomLabel: roomLabel ?? this.roomLabel,
      elementLabel: elementLabel ?? this.elementLabel,
      elementCategory: elementCategory ?? this.elementCategory,
      condition: condition ?? this.condition,
      damageDescription: clearDamageDescription
          ? null
          : (damageDescription ?? this.damageDescription),
      repairAmount: clearRepairAmount
          ? null
          : (repairAmount ?? this.repairAmount),
      chargedTo: chargedTo ?? this.chargedTo,
      photoPaths: photoPaths ?? this.photoPaths,
    );
  }
}
