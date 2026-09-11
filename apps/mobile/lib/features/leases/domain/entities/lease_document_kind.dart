import 'package:json_annotation/json_annotation.dart';

/// `LeaseDocumentKind` du contrat d'API (`docs/api/phase2-contract.md`).
enum LeaseDocumentKind {
  @JsonValue('CONTRACT')
  contract,
  @JsonValue('AMENDMENT')
  amendment,
  @JsonValue('NOTICE')
  notice,
  @JsonValue('TERMINATION')
  termination,
  @JsonValue('INVENTORY')
  inventory,
  @JsonValue('INSURANCE')
  insurance,
  @JsonValue('OTHER')
  other,
}

extension LeaseDocumentKindLabel on LeaseDocumentKind {
  String get label => switch (this) {
    LeaseDocumentKind.contract => 'Contrat',
    LeaseDocumentKind.amendment => 'Avenant',
    LeaseDocumentKind.notice => 'Préavis',
    LeaseDocumentKind.termination => 'Résiliation',
    LeaseDocumentKind.inventory => 'État des lieux',
    LeaseDocumentKind.insurance => 'Assurance',
    LeaseDocumentKind.other => 'Autre',
  };
}
