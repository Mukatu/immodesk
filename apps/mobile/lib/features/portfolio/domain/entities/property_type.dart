import 'package:json_annotation/json_annotation.dart';

/// `PropertyType` du contrat d'API (`docs/api/phase1-contract.md`).
enum PropertyType {
  @JsonValue('HOUSE')
  house,
  @JsonValue('VILLA')
  villa,
  @JsonValue('APARTMENT_BUILDING')
  apartmentBuilding,
  @JsonValue('COMPOUND')
  compound,
  @JsonValue('COMMERCIAL_BUILDING')
  commercialBuilding,
  @JsonValue('MIXED_USE')
  mixedUse,
  @JsonValue('LAND')
  land,
  @JsonValue('WAREHOUSE')
  warehouse,
  @JsonValue('OTHER')
  other,
}

extension PropertyTypeLabel on PropertyType {
  String get label => switch (this) {
    PropertyType.house => 'Maison',
    PropertyType.villa => 'Villa',
    PropertyType.apartmentBuilding => "Immeuble d'appartements",
    PropertyType.compound => 'Enclos',
    PropertyType.commercialBuilding => 'Immeuble commercial',
    PropertyType.mixedUse => 'Usage mixte',
    PropertyType.land => 'Terrain',
    PropertyType.warehouse => 'Entrepôt',
    PropertyType.other => 'Autre',
  };
}
