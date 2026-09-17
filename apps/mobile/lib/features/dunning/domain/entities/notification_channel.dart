import 'package:json_annotation/json_annotation.dart';

/// `NotificationChannel` du contrat d'API (`docs/api/phase9-contract.md`).
enum NotificationChannel {
  @JsonValue('WHATSAPP')
  whatsapp,
  @JsonValue('SMS')
  sms,
  @JsonValue('EMAIL')
  email,
  @JsonValue('PUSH')
  push,
  @JsonValue('IN_APP')
  inApp,
}

extension NotificationChannelLabel on NotificationChannel {
  String get label => switch (this) {
    NotificationChannel.whatsapp => 'WhatsApp',
    NotificationChannel.sms => 'SMS',
    NotificationChannel.email => 'E-mail',
    NotificationChannel.push => 'Notification push',
    NotificationChannel.inApp => "Dans l'application",
  };
}
