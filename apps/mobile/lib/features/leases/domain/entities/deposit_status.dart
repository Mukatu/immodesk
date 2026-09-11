import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `DepositStatus` du contrat d'API (`docs/api/phase2-contract.md`).
enum DepositStatus {
  @JsonValue('PENDING')
  pending,
  @JsonValue('PARTIALLY_PAID')
  partiallyPaid,
  @JsonValue('HELD')
  held,
  @JsonValue('PARTIALLY_REFUNDED')
  partiallyRefunded,
  @JsonValue('REFUNDED')
  refunded,
  @JsonValue('FORFEITED')
  forfeited,
}

extension DepositStatusLabel on DepositStatus {
  String get label => switch (this) {
    DepositStatus.pending => 'En attente',
    DepositStatus.partiallyPaid => 'Partiellement payé',
    DepositStatus.held => 'Détenu',
    DepositStatus.partiallyRefunded => 'Partiellement restitué',
    DepositStatus.refunded => 'Restitué',
    DepositStatus.forfeited => 'Confisqué',
  };

  StatusBadgeTone get tone => switch (this) {
    DepositStatus.pending => StatusBadgeTone.warning,
    DepositStatus.partiallyPaid => StatusBadgeTone.info,
    DepositStatus.held => StatusBadgeTone.success,
    DepositStatus.partiallyRefunded => StatusBadgeTone.info,
    DepositStatus.refunded => StatusBadgeTone.neutral,
    DepositStatus.forfeited => StatusBadgeTone.danger,
  };
}
