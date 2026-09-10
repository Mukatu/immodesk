import 'package:json_annotation/json_annotation.dart';

/// `UnitType` du contrat d'API (`docs/api/phase1-contract.md`).
enum UnitType {
  @JsonValue('STUDIO')
  studio,
  @JsonValue('ROOM')
  room,
  @JsonValue('APARTMENT')
  apartment,
  @JsonValue('HOUSE')
  house,
  @JsonValue('SHOP')
  shop,
  @JsonValue('OFFICE')
  office,
  @JsonValue('WAREHOUSE')
  warehouse,
  @JsonValue('PARKING')
  parking,
  @JsonValue('LAND_PLOT')
  landPlot,
  @JsonValue('OTHER')
  other,
}

extension UnitTypeLabel on UnitType {
  String get label => switch (this) {
    UnitType.studio => 'Studio',
    UnitType.room => 'Chambre',
    UnitType.apartment => 'Appartement',
    UnitType.house => 'Maison',
    UnitType.shop => 'Boutique',
    UnitType.office => 'Bureau',
    UnitType.warehouse => 'Entrepôt',
    UnitType.parking => 'Parking',
    UnitType.landPlot => 'Parcelle',
    UnitType.other => 'Autre',
  };
}
