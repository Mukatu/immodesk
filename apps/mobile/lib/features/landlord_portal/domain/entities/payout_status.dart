import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `PayoutStatus` du reversement au bailleur (`docs/api/phase7-contract.md`).
enum PayoutStatus {
  @JsonValue('PENDING')
  pending,
  @JsonValue('APPROVED')
  approved,
  @JsonValue('PROCESSING')
  processing,
  @JsonValue('PAID')
  paid,
  @JsonValue('FAILED')
  failed,
  @JsonValue('CANCELLED')
  cancelled,
}

extension PayoutStatusLabel on PayoutStatus {
  String get label => switch (this) {
    PayoutStatus.pending => 'En attente de validation',
    PayoutStatus.approved => 'Validé',
    PayoutStatus.processing => 'En cours de traitement',
    PayoutStatus.paid => 'Perçu',
    PayoutStatus.failed => 'Échoué',
    PayoutStatus.cancelled => 'Annulé',
  };

  StatusBadgeTone get tone => switch (this) {
    PayoutStatus.pending => StatusBadgeTone.neutral,
    PayoutStatus.approved => StatusBadgeTone.info,
    PayoutStatus.processing => StatusBadgeTone.warning,
    PayoutStatus.paid => StatusBadgeTone.success,
    PayoutStatus.failed => StatusBadgeTone.danger,
    PayoutStatus.cancelled => StatusBadgeTone.danger,
  };
}
