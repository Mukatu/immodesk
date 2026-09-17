import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/dunning_run.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/dunning_step_status.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/message_status.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/notification_channel.dart';

void main() {
  test('DunningRun.fromJson mappe une relance envoyée avec succès', () {
    final run = DunningRun.fromJson(const {
      'id': 'run-1',
      'ruleId': 'rule-1',
      'ruleName': 'Rappel à échéance',
      'stepOrder': 1,
      'status': 'SENT',
      'runDate': '2026-02-06',
      'scheduledAt': '2026-02-06T08:00:00Z',
      'executedAt': '2026-02-06T08:03:00Z',
      'daysOverdue': 1,
      'balanceAmount': 60000,
      'channel': 'WHATSAPP',
      'invoice': {'id': 'inv-1', 'invoiceNumber': 'LOY-202602-0001'},
      'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
      'notificationId': 'notif-1',
      'messageLogId': 'log-1',
      'messageStatus': 'DELIVERED',
      'guarantorNotified': false,
      'penaltyApplied': false,
      'penaltyAmount': 0,
      'skipReason': null,
      'errorMessage': null,
    });

    expect(run.status, DunningStepStatus.sent);
    expect(run.channel, NotificationChannel.whatsapp);
    expect(run.messageStatus, MessageStatus.delivered);
    expect(run.tenant.displayName, 'Alice Ndongo');
    expect(run.invoice?.invoiceNumber, 'LOY-202602-0001');
  });

  test(
    'DunningRun.fromJson mappe une relance ignorée doublée vers le garant',
    () {
      final run = DunningRun.fromJson(const {
        'id': 'run-2',
        'ruleId': 'rule-2',
        'ruleName': 'Mise en demeure',
        'stepOrder': 3,
        'status': 'SKIPPED',
        'runDate': '2026-02-20',
        'scheduledAt': '2026-02-20T08:00:00Z',
        'executedAt': null,
        'daysOverdue': 15,
        'balanceAmount': 60000,
        'channel': 'SMS',
        'invoice': null,
        'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
        'notificationId': null,
        'messageLogId': null,
        'messageStatus': null,
        'guarantorNotified': true,
        'penaltyApplied': true,
        'penaltyAmount': 3000,
        'skipReason': 'Facture déjà relancée aujourd\'hui.',
        'errorMessage': null,
      });

      expect(run.status, DunningStepStatus.skipped);
      expect(run.guarantorNotified, isTrue);
      expect(run.skipReason, 'Facture déjà relancée aujourd\'hui.');
      expect(run.penaltyApplied, isTrue);
      expect(run.penaltyAmount, 3000);
      expect(run.invoice, isNull);
      expect(run.messageStatus, isNull);
    },
  );

  test(
    'DunningRun.fromJson mappe une relance échouée avec son message d\'erreur',
    () {
      final run = DunningRun.fromJson(const {
        'id': 'run-3',
        'ruleId': 'rule-1',
        'ruleName': 'Rappel à échéance',
        'stepOrder': 1,
        'status': 'FAILED',
        'runDate': '2026-03-01',
        'scheduledAt': '2026-03-01T08:00:00Z',
        'executedAt': '2026-03-01T08:00:05Z',
        'daysOverdue': 1,
        'balanceAmount': 45000,
        'channel': 'EMAIL',
        'tenant': {'id': 'tenant-2', 'displayName': 'Marc Ossalé'},
        'errorMessage': 'Adresse e-mail invalide.',
      });

      expect(run.status, DunningStepStatus.failed);
      expect(run.errorMessage, 'Adresse e-mail invalide.');
      expect(run.guarantorNotified, isFalse);
    },
  );
}
