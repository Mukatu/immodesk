import 'package:json_annotation/json_annotation.dart';

/// `MessageStatus` du contrat d'API : statut réel de remise dans
/// `message_logs`, distinct de [DunningStepStatus] qui ne porte que l'état
/// du palier de relance (`docs/api/phase9-contract.md` § Énumérations).
enum MessageStatus {
  @JsonValue('QUEUED')
  queued,
  @JsonValue('SENT')
  sent,
  @JsonValue('DELIVERED')
  delivered,
  @JsonValue('READ')
  read,
  @JsonValue('FAILED')
  failed,
  @JsonValue('REJECTED')
  rejected,
  @JsonValue('EXPIRED')
  expired,
}

extension MessageStatusLabel on MessageStatus {
  String get label => switch (this) {
    MessageStatus.queued => "En file d'attente",
    MessageStatus.sent => 'Envoyé',
    MessageStatus.delivered => 'Remis',
    MessageStatus.read => 'Lu',
    MessageStatus.failed => 'Échoué',
    MessageStatus.rejected => 'Rejeté',
    MessageStatus.expired => 'Expiré',
  };
}
