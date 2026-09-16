import 'package:json_annotation/json_annotation.dart';

/// `MeterType` du contrat d'API (`docs/api/phase8-contract.md`) : noms
/// actuels des fournisseurs congolais (E2C, LCDE), pas les anciennes
/// appellations SNE/SNDE citées par le plan de phases.
enum MeterType {
  @JsonValue('ELECTRICITY_E2C')
  electricityE2c,
  @JsonValue('WATER_LCDE')
  waterLcde,
  @JsonValue('GAS')
  gas,
  @JsonValue('PRIVATE_SUBMETER')
  privateSubmeter,
  @JsonValue('SOLAR')
  solar,
  @JsonValue('OTHER')
  other,
}

extension MeterTypeLabel on MeterType {
  String get label => switch (this) {
    MeterType.electricityE2c => 'Électricité (E2C)',
    MeterType.waterLcde => 'Eau (LCDE)',
    MeterType.gas => 'Gaz',
    MeterType.privateSubmeter => 'Sous-compteur privé',
    MeterType.solar => 'Solaire',
    MeterType.other => 'Autre',
  };

  String get apiValue => switch (this) {
    MeterType.electricityE2c => 'ELECTRICITY_E2C',
    MeterType.waterLcde => 'WATER_LCDE',
    MeterType.gas => 'GAS',
    MeterType.privateSubmeter => 'PRIVATE_SUBMETER',
    MeterType.solar => 'SOLAR',
    MeterType.other => 'OTHER',
  };

  static MeterType fromApiValue(String value) => MeterType.values.firstWhere(
    (t) => t.apiValue == value,
    orElse: () => MeterType.other,
  );
}
