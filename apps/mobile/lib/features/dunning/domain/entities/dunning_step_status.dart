import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `DunningStepStatus` du contrat d'API (`docs/api/phase9-contract.md`).
/// Six valeurs exactes : il n'existe pas de statut `DELIVERED` ici, la
/// remise effective se lit dans `message_logs` (voir [MessageStatus]).
enum DunningStepStatus {
  @JsonValue('PENDING')
  pending,
  @JsonValue('RUNNING')
  running,
  @JsonValue('SENT')
  sent,
  @JsonValue('SKIPPED')
  skipped,
  @JsonValue('FAILED')
  failed,
  @JsonValue('CANCELLED')
  cancelled,
}

extension DunningStepStatusLabel on DunningStepStatus {
  String get label => switch (this) {
    DunningStepStatus.pending => 'En attente',
    DunningStepStatus.running => 'En cours',
    DunningStepStatus.sent => 'Envoyée',
    DunningStepStatus.skipped => 'Ignorée',
    DunningStepStatus.failed => 'Échouée',
    DunningStepStatus.cancelled => 'Annulée',
  };

  StatusBadgeTone get tone => switch (this) {
    DunningStepStatus.pending => StatusBadgeTone.neutral,
    DunningStepStatus.running => StatusBadgeTone.info,
    DunningStepStatus.sent => StatusBadgeTone.success,
    DunningStepStatus.skipped => StatusBadgeTone.neutral,
    DunningStepStatus.failed => StatusBadgeTone.danger,
    DunningStepStatus.cancelled => StatusBadgeTone.neutral,
  };
}
