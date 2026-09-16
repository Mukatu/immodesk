import 'package:json_annotation/json_annotation.dart';

/// Partie qui supporte le coût d'un poste dégradé (`chargedTo` de
/// `InspectionItemInput`, `docs/api/phase8-contract.md`).
enum ChargedTo {
  @JsonValue('LANDLORD')
  landlord,
  @JsonValue('TENANT')
  tenant,
  @JsonValue('ORGANIZATION')
  organization,
}

extension ChargedToLabel on ChargedTo {
  String get label => switch (this) {
    ChargedTo.landlord => 'Bailleur',
    ChargedTo.tenant => 'Locataire',
    ChargedTo.organization => 'Agence',
  };

  String get apiValue => switch (this) {
    ChargedTo.landlord => 'LANDLORD',
    ChargedTo.tenant => 'TENANT',
    ChargedTo.organization => 'ORGANIZATION',
  };
}
