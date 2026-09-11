import 'package:json_annotation/json_annotation.dart';

/// `DepositMovementType` du contrat d'API (`docs/api/phase2-contract.md`).
///
/// Non utilisé à l'affichage en phase 2 mobile (lecture seule du bail et du
/// dépôt, sans historique des mouvements) : posé pour réutilisation future.
enum DepositMovementType {
  @JsonValue('COLLECTION')
  collection,
  @JsonValue('REFUND')
  refund,
  @JsonValue('DEDUCTION')
  deduction,
  @JsonValue('TRANSFER')
  transfer,
  @JsonValue('ADJUSTMENT')
  adjustment,
}

extension DepositMovementTypeLabel on DepositMovementType {
  String get label => switch (this) {
    DepositMovementType.collection => 'Encaissement',
    DepositMovementType.refund => 'Restitution',
    DepositMovementType.deduction => 'Retenue',
    DepositMovementType.transfer => 'Transfert',
    DepositMovementType.adjustment => 'Ajustement',
  };
}
