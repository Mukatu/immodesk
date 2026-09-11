import 'package:json_annotation/json_annotation.dart';

/// `LeasePartyRole` du contrat d'API (`docs/api/phase2-contract.md`).
enum LeasePartyRole {
  @JsonValue('PRIMARY_TENANT')
  primaryTenant,
  @JsonValue('CO_TENANT')
  coTenant,
  @JsonValue('GUARANTOR')
  guarantor,
  @JsonValue('OCCUPANT')
  occupant,
}

extension LeasePartyRoleLabel on LeasePartyRole {
  String get label => switch (this) {
    LeasePartyRole.primaryTenant => 'Locataire principal',
    LeasePartyRole.coTenant => 'Colocataire',
    LeasePartyRole.guarantor => 'Garant',
    LeasePartyRole.occupant => 'Occupant',
  };
}
