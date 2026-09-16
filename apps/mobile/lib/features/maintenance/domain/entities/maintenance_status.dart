import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `MaintenanceStatus` du contrat d'API (`docs/api/phase8-contract.md`).
enum MaintenanceStatus {
  @JsonValue('OPEN')
  open,
  @JsonValue('ACKNOWLEDGED')
  acknowledged,
  @JsonValue('ASSIGNED')
  assigned,
  @JsonValue('IN_PROGRESS')
  inProgress,
  @JsonValue('ON_HOLD')
  onHold,
  @JsonValue('RESOLVED')
  resolved,
  @JsonValue('CLOSED')
  closed,
  @JsonValue('REJECTED')
  rejected,
}

extension MaintenanceStatusLabel on MaintenanceStatus {
  String get label => switch (this) {
    MaintenanceStatus.open => 'Ouverte',
    MaintenanceStatus.acknowledged => 'Prise en compte',
    MaintenanceStatus.assigned => 'Affectée',
    MaintenanceStatus.inProgress => 'En cours',
    MaintenanceStatus.onHold => 'En suspens',
    MaintenanceStatus.resolved => 'Résolue',
    MaintenanceStatus.closed => 'Clôturée',
    MaintenanceStatus.rejected => 'Refusée',
  };

  String get apiValue => switch (this) {
    MaintenanceStatus.open => 'OPEN',
    MaintenanceStatus.acknowledged => 'ACKNOWLEDGED',
    MaintenanceStatus.assigned => 'ASSIGNED',
    MaintenanceStatus.inProgress => 'IN_PROGRESS',
    MaintenanceStatus.onHold => 'ON_HOLD',
    MaintenanceStatus.resolved => 'RESOLVED',
    MaintenanceStatus.closed => 'CLOSED',
    MaintenanceStatus.rejected => 'REJECTED',
  };

  StatusBadgeTone get tone => switch (this) {
    MaintenanceStatus.open => StatusBadgeTone.info,
    MaintenanceStatus.acknowledged => StatusBadgeTone.info,
    MaintenanceStatus.assigned => StatusBadgeTone.info,
    MaintenanceStatus.inProgress => StatusBadgeTone.warning,
    MaintenanceStatus.onHold => StatusBadgeTone.warning,
    MaintenanceStatus.resolved => StatusBadgeTone.success,
    MaintenanceStatus.closed => StatusBadgeTone.success,
    MaintenanceStatus.rejected => StatusBadgeTone.danger,
  };

  /// Statuts que le démarcheur peut choisir depuis une mise à jour terrain
  /// (`POST /maintenance-requests/{id}/updates`) : ni l'ouverture ni le
  /// refus, réservés au gestionnaire.
  static const List<MaintenanceStatus> collectorSelectable = [
    MaintenanceStatus.inProgress,
    MaintenanceStatus.onHold,
    MaintenanceStatus.resolved,
  ];
}
