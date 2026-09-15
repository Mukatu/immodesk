import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `StatementStatus` du relevé de gérance (`docs/api/phase7-contract.md`).
/// Il n'existe ni `VALIDATED` ni `APPROVED` : « valider » signifie passer
/// `ISSUED`.
enum StatementStatus {
  @JsonValue('DRAFT')
  draft,
  @JsonValue('ISSUED')
  issued,
  @JsonValue('SENT')
  sent,
  @JsonValue('PAID')
  paid,
  @JsonValue('CANCELLED')
  cancelled,
}

extension StatementStatusLabel on StatementStatus {
  String get label => switch (this) {
    StatementStatus.draft => 'Brouillon',
    StatementStatus.issued => 'Émis',
    StatementStatus.sent => 'Envoyé au bailleur',
    StatementStatus.paid => 'Reversé',
    StatementStatus.cancelled => 'Annulé',
  };

  StatusBadgeTone get tone => switch (this) {
    StatementStatus.draft => StatusBadgeTone.neutral,
    StatementStatus.issued => StatusBadgeTone.info,
    StatementStatus.sent => StatusBadgeTone.warning,
    StatementStatus.paid => StatusBadgeTone.success,
    StatementStatus.cancelled => StatusBadgeTone.danger,
  };
}
