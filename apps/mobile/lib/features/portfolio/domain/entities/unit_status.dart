import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `UnitStatus` du contrat d'API (`docs/api/phase1-contract.md`).
enum UnitStatus {
  @JsonValue('AVAILABLE')
  available,
  @JsonValue('RESERVED')
  reserved,
  @JsonValue('OCCUPIED')
  occupied,
  @JsonValue('UNDER_MAINTENANCE')
  underMaintenance,
  @JsonValue('UNAVAILABLE')
  unavailable,
}

extension UnitStatusLabel on UnitStatus {
  String get label => switch (this) {
    UnitStatus.available => 'Disponible',
    UnitStatus.reserved => 'Réservé',
    UnitStatus.occupied => 'Occupé',
    UnitStatus.underMaintenance => 'En travaux',
    UnitStatus.unavailable => 'Indisponible',
  };

  StatusBadgeTone get tone => switch (this) {
    UnitStatus.available => StatusBadgeTone.success,
    UnitStatus.reserved => StatusBadgeTone.info,
    UnitStatus.occupied => StatusBadgeTone.neutral,
    UnitStatus.underMaintenance => StatusBadgeTone.warning,
    UnitStatus.unavailable => StatusBadgeTone.danger,
  };
}
