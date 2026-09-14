import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/sync/outbox_ordering.dart';
import 'package:immodesk_mobile/core/sync/outbox_repository.dart';
import 'package:immodesk_mobile/core/sync/outbox_types.dart';

void main() {
  late AppDatabase db;
  late OutboxRepository repository;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    repository = OutboxRepository(db);
  });

  tearDown(() => db.close());

  test('sérialise et relit le payload JSON d\'une opération', () async {
    final String clientRef = await repository.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.cashReceipt,
      payload: const {'tenantId': 't-1', 'amount': 15000},
    );

    final List<OutboxRow> rows = await repository.all('org-1');
    expect(rows, hasLength(1));
    expect(rows.single.clientRef, clientRef);
    expect(rows.single.operation, 'CASH_RECEIPT');
    expect(rows.single.status, 'PENDING');
  });

  test('ordonne un lot en respectant les dépendances (dependsOn)', () async {
    final String docRef = await repository.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.document,
      payload: const {'filePath': '/tmp/photo.jpg'},
    );
    final String receiptRef = await repository.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.cashReceipt,
      payload: const {'amount': 5000},
      dependsOn: [docRef],
    );

    final List<OutboxRow> rows = await repository.all('org-1');
    // Le CASH_RECEIPT a été créé après le DOCUMENT dont il dépend : sans
    // tri par dépendances, l'ordre chronologique suffirait déjà ici. On
    // vérifie donc explicitement que l'algorithme place la dépendance
    // avant même en partant d'un ordre inversé.
    final List<OutboxRow> reversed = rows.reversed.toList();
    final List<OutboxRow> ordered = orderForBatch(reversed, repository);

    expect(ordered.map((r) => r.clientRef).toList(), [docRef, receiptRef]);
  });

  test(
    'conserve le batchRef entre deux tentatives après une coupure',
    () async {
      final String ref1 = await repository.enqueue(
        organizationId: 'org-1',
        type: OutboxOperationType.cashReceipt,
        payload: const {'amount': 1000},
      );
      final String ref2 = await repository.enqueue(
        organizationId: 'org-1',
        type: OutboxOperationType.cashReceipt,
        payload: const {'amount': 2000},
      );

      await repository.markSending([ref1, ref2], 'batch-abc');
      expect(await repository.inFlightBatchRef('org-1'), 'batch-abc');

      // Coupure réseau : le lot reste `SENDING` avec le même batchRef, une
      // relecture (nouvelle tentative) doit retrouver exactement ce lot,
      // jamais un nouveau `batchRef` généré.
      final List<OutboxRow> resumed = await repository.selectBatchCandidates(
        'org-1',
        50,
      );
      expect(resumed.map((r) => r.batchRef).toSet(), {'batch-abc'});
      expect(await repository.inFlightBatchRef('org-1'), 'batch-abc');
    },
  );

  test(
    'un élément CONFLICT ne peut pas être relancé depuis l\'écran',
    () async {
      final String ref = await repository.enqueue(
        organizationId: 'org-1',
        type: OutboxOperationType.cashReceipt,
        payload: const {'amount': 1000},
      );
      await repository.markFailedOrConflict(
        ref,
        isConflict: true,
        code: 'BILLING.INVOICE_CANCELLED',
        message: 'La facture a été annulée entre-temps.',
      );

      final bool retried = await repository.retryFromScreen(ref);
      expect(retried, isFalse);

      final List<OutboxRow> rows = await repository.all('org-1');
      expect(rows.single.status, 'CONFLICT');
      expect(rows.single.lastErrorMessage, contains('annulée'));
    },
  );

  test('un élément FAILED peut être relancé, repasse en PENDING', () async {
    final String ref = await repository.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.cashReceipt,
      payload: const {'amount': 1000},
    );
    await repository.markFailedOrConflict(
      ref,
      isConflict: false,
      code: 'BILLING.INVALID_AMOUNT',
      message: 'Montant invalide.',
    );

    final bool retried = await repository.retryFromScreen(ref);
    expect(retried, isTrue);

    final List<OutboxRow> rows = await repository.all('org-1');
    expect(rows.single.status, 'PENDING');
  });
}
