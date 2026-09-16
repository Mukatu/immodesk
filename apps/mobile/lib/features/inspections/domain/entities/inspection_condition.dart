import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `InspectionCondition` du contrat d'API (`docs/api/phase8-contract.md`) :
/// six niveaux réels (le plan en citait cinq). Libellés d'affichage repris
/// tels quels du contrat.
enum InspectionCondition {
  @JsonValue('NEW')
  brandNew,
  @JsonValue('GOOD')
  good,
  @JsonValue('FAIR')
  fair,
  @JsonValue('POOR')
  poor,
  @JsonValue('DAMAGED')
  damaged,
  @JsonValue('MISSING')
  missing,
}

extension InspectionConditionLabel on InspectionCondition {
  String get label => switch (this) {
    InspectionCondition.brandNew => 'Neuf',
    InspectionCondition.good => 'Bon état',
    InspectionCondition.fair => 'État d\'usage',
    InspectionCondition.poor => 'Mauvais état',
    InspectionCondition.damaged => 'Dégradé',
    InspectionCondition.missing => 'Manquant',
  };

  String get apiValue => switch (this) {
    InspectionCondition.brandNew => 'NEW',
    InspectionCondition.good => 'GOOD',
    InspectionCondition.fair => 'FAIR',
    InspectionCondition.poor => 'POOR',
    InspectionCondition.damaged => 'DAMAGED',
    InspectionCondition.missing => 'MISSING',
  };

  StatusBadgeTone get tone => switch (this) {
    InspectionCondition.brandNew => StatusBadgeTone.success,
    InspectionCondition.good => StatusBadgeTone.success,
    InspectionCondition.fair => StatusBadgeTone.info,
    InspectionCondition.poor => StatusBadgeTone.warning,
    InspectionCondition.damaged => StatusBadgeTone.danger,
    InspectionCondition.missing => StatusBadgeTone.danger,
  };

  /// Arbitrage du contrat : « aucune photo n'est exigée sur un poste en bon
  /// état ; elle devient obligatoire dès que l'état est POOR, DAMAGED ou
  /// MISSING » (défaut `inspectionPhotoRequiredFrom = 'POOR'` des
  /// paramètres d'organisation — non surchargé côté mobile).
  bool get requiresPhoto =>
      this == InspectionCondition.poor ||
      this == InspectionCondition.damaged ||
      this == InspectionCondition.missing;
}

/// Toutes les valeurs, dans l'ordre d'affichage attendu par le sélecteur à
/// six niveaux (du meilleur au pire état).
const List<InspectionCondition> inspectionConditionDisplayOrder = [
  InspectionCondition.brandNew,
  InspectionCondition.good,
  InspectionCondition.fair,
  InspectionCondition.poor,
  InspectionCondition.damaged,
  InspectionCondition.missing,
];
