import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `MaintenancePriority` du contrat d'API (`docs/api/phase8-contract.md`).
enum MaintenancePriority {
  @JsonValue('LOW')
  low,
  @JsonValue('NORMAL')
  normal,
  @JsonValue('HIGH')
  high,
  @JsonValue('URGENT')
  urgent,
}

extension MaintenancePriorityLabel on MaintenancePriority {
  String get label => switch (this) {
    MaintenancePriority.low => 'Faible',
    MaintenancePriority.normal => 'Normale',
    MaintenancePriority.high => 'Haute',
    MaintenancePriority.urgent => 'Urgente',
  };

  String get apiValue => switch (this) {
    MaintenancePriority.low => 'LOW',
    MaintenancePriority.normal => 'NORMAL',
    MaintenancePriority.high => 'HIGH',
    MaintenancePriority.urgent => 'URGENT',
  };

  StatusBadgeTone get tone => switch (this) {
    MaintenancePriority.low => StatusBadgeTone.neutral,
    MaintenancePriority.normal => StatusBadgeTone.info,
    MaintenancePriority.high => StatusBadgeTone.warning,
    MaintenancePriority.urgent => StatusBadgeTone.danger,
  };
}

/// `MaintenanceReporter` du contrat d'API.
enum MaintenanceReporter {
  @JsonValue('TENANT')
  tenant,
  @JsonValue('LANDLORD')
  landlord,
  @JsonValue('COLLECTOR')
  collector,
  @JsonValue('MANAGER')
  manager,
  @JsonValue('INSPECTION')
  inspection,
}

extension MaintenanceReporterLabel on MaintenanceReporter {
  String get label => switch (this) {
    MaintenanceReporter.tenant => 'Locataire',
    MaintenanceReporter.landlord => 'Bailleur',
    MaintenanceReporter.collector => 'Démarcheur',
    MaintenanceReporter.manager => 'Gestionnaire',
    MaintenanceReporter.inspection => 'État des lieux',
  };
}
