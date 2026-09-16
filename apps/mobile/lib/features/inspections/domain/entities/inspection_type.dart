import 'package:json_annotation/json_annotation.dart';

/// `InspectionType` du contrat d'API (`docs/api/phase8-contract.md`) :
/// quatre valeurs réelles. Le plan de phases citait `ENTRY`/`EXIT`, qui
/// n'existent pas dans le schéma — ce contrat prime.
enum InspectionType {
  @JsonValue('MOVE_IN')
  moveIn,
  @JsonValue('MOVE_OUT')
  moveOut,
  @JsonValue('PERIODIC')
  periodic,
  @JsonValue('CONTRADICTORY')
  contradictory,
}

extension InspectionTypeLabel on InspectionType {
  String get label => switch (this) {
    InspectionType.moveIn => 'État des lieux d\'entrée',
    InspectionType.moveOut => 'État des lieux de sortie',
    InspectionType.periodic => 'État des lieux périodique',
    InspectionType.contradictory => 'État des lieux contradictoire',
  };

  String get apiValue => switch (this) {
    InspectionType.moveIn => 'MOVE_IN',
    InspectionType.moveOut => 'MOVE_OUT',
    InspectionType.periodic => 'PERIODIC',
    InspectionType.contradictory => 'CONTRADICTORY',
  };
}
