import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/maintenance/domain/entities/maintenance_detail.dart';
import 'package:immodesk_mobile/features/maintenance/domain/entities/maintenance_priority.dart';
import 'package:immodesk_mobile/features/maintenance/domain/entities/maintenance_status.dart';
import 'package:immodesk_mobile/features/maintenance/domain/entities/maintenance_summary.dart';
import 'package:immodesk_mobile/features/maintenance/domain/entities/maintenance_update.dart';

void main() {
  test('MaintenanceSummary.fromJson mappe les énumérations réelles', () {
    final summary = MaintenanceSummary.fromJson(const {
      'id': 'mnt-1',
      'reference': 'MNT-202609-0001',
      'status': 'IN_PROGRESS',
      'priority': 'URGENT',
      'title': 'Fuite salle de bain',
      'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
      'unit': {'id': 'unit-1', 'code': 'A01'},
      'reportedAt': '2026-09-10T08:00:00Z',
      'slaDueAt': '2026-09-10T12:00:00Z',
      'isOverdue': true,
      'assignedToUserId': 'user-1',
      'ageHours': 26,
    });

    expect(summary.status, MaintenanceStatus.inProgress);
    expect(summary.priority, MaintenancePriority.urgent);
    expect(summary.isOverdue, isTrue);
    expect(summary.unit?.code, 'A01');
  });

  test('MaintenanceDetail.fromJson mappe l\'historique des mises à jour', () {
    final detail = MaintenanceDetail.fromJson(const {
      'id': 'mnt-1',
      'reference': 'MNT-202609-0001',
      'status': 'RESOLVED',
      'priority': 'HIGH',
      'title': 'Fuite salle de bain',
      'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
      'reportedAt': '2026-09-10T08:00:00Z',
      'description': 'Fuite sous l\'évier',
      'reporterType': 'TENANT',
      'estimatedAmount': 15000,
      'actualAmount': 12000,
      'updates': [
        {
          'id': 'upd-1',
          'requestId': 'mnt-1',
          'authorLabel': 'Jean Démarcheur',
          'previousStatus': 'ASSIGNED',
          'newStatus': 'IN_PROGRESS',
          'message': 'Sur place, intervention en cours.',
          'occurredAt': '2026-09-10T09:00:00Z',
        },
      ],
    });

    expect(detail.updates, hasLength(1));
    expect(detail.updates.single.newStatus, MaintenanceStatus.inProgress);
    expect(detail.updates.single.previousStatus, MaintenanceStatus.assigned);
    expect(detail.actualAmount, 12000);
  });

  test(
    'MaintenanceUpdate.toJson conserve la visibilité locataire par défaut',
    () {
      const update = MaintenanceUpdate(
        id: 'upd-2',
        requestId: 'mnt-1',
        occurredAt: '2026-09-11T10:00:00Z',
      );
      final json = update.toJson();
      expect(json['isVisibleToTenant'], isTrue);
    },
  );
}
