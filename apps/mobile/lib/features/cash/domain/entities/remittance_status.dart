import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `RemittanceStatus` du contrat d'API (`docs/api/phase3-contract.md`).
enum RemittanceStatus {
  @JsonValue('OPEN')
  open,
  @JsonValue('SUBMITTED')
  submitted,
  @JsonValue('VERIFIED')
  verified,
  @JsonValue('DEPOSITED')
  deposited,
  @JsonValue('REJECTED')
  rejected,
  @JsonValue('CANCELLED')
  cancelled,
}

extension RemittanceStatusLabel on RemittanceStatus {
  String get label => switch (this) {
    RemittanceStatus.open => 'Brouillon',
    RemittanceStatus.submitted => 'Soumise',
    RemittanceStatus.verified => 'Vérifiée',
    RemittanceStatus.deposited => 'Déposée',
    RemittanceStatus.rejected => 'Rejetée',
    RemittanceStatus.cancelled => 'Annulée',
  };

  StatusBadgeTone get tone => switch (this) {
    RemittanceStatus.open => StatusBadgeTone.neutral,
    RemittanceStatus.submitted => StatusBadgeTone.info,
    RemittanceStatus.verified => StatusBadgeTone.success,
    RemittanceStatus.deposited => StatusBadgeTone.success,
    RemittanceStatus.rejected => StatusBadgeTone.danger,
    RemittanceStatus.cancelled => StatusBadgeTone.neutral,
  };
}
