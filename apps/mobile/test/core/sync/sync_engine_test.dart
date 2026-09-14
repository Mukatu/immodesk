import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/sync/mobile_config.dart';
import 'package:immodesk_mobile/core/sync/outbox_repository.dart';
import 'package:immodesk_mobile/core/sync/outbox_types.dart';
import 'package:immodesk_mobile/core/sync/pull_service.dart';
import 'package:immodesk_mobile/core/sync/sync_dto.dart';
import 'package:immodesk_mobile/core/sync/sync_engine.dart';
import 'package:immodesk_mobile/core/sync/sync_pull_dto.dart';
import 'package:immodesk_mobile/core/sync/sync_remote_data_source.dart';
import 'package:mocktail/mocktail.dart';

class _MockSyncRemoteDataSource extends Mock implements SyncRemoteDataSource {}

class _MockPullService extends Mock implements PullService {}

class _FakeSyncBatchInput extends Fake implements SyncBatchInput {}

const MobileConfig _config = MobileConfig(maxOperationsPerBatch: 50);

SyncBatchResult _resultFor(
  String batchRef,
  Map<String, SyncOperationOutcome> outcomes,
) {
  return SyncBatchResult(
    batchId: 'batch-id-1',
    batchRef: batchRef,
    status: 'APPLIED',
    operationsCount: outcomes.length,
    appliedCount: outcomes.length,
    rejectedCount: 0,
    conflictsCount: 0,
    receivedAt: '2026-09-14T10:00:00Z',
    appliedAt: '2026-09-14T10:00:01Z',
    results: outcomes.entries
        .map(
          (e) => SyncOperationResult(
            clientRef: e.key,
            type: 'CASH_RECEIPT',
            outcome: e.value,
            message: switch (e.value) {
              SyncOperationOutcome.rejected => 'Montant invalide.',
              SyncOperationOutcome.conflict => 'Facture annulée entre-temps.',
              _ => null,
            },
          ),
        )
        .toList(),
  );
}

void main() {
  setUpAll(() {
    registerFallbackValue(_FakeSyncBatchInput());
  });

  late AppDatabase db;
  late OutboxRepository outbox;
  late _MockSyncRemoteDataSource remote;
  late _MockPullService pullService;
  late SyncEngine engine;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    outbox = OutboxRepository(db);
    remote = _MockSyncRemoteDataSource();
    pullService = _MockPullService();
    when(() => pullService.pullAndStore(any())).thenAnswer(
      (_) async => const SyncPullResult(
        serverTime: '2026-09-14T10:00:00Z',
        nextCursor: 'cursor-1',
        hasMore: false,
        retentionHours: 72,
        changed: SyncPullChanged(),
      ),
    );
    when(
      () => pullService.purgeIfStale(any(), any()),
    ).thenAnswer((_) async => false);
    engine = SyncEngine(
      db: db,
      outbox: outbox,
      remote: remote,
      pullService: pullService,
      documentUploader: (_) async =>
          throw StateError('Aucune pièce jointe attendue dans ce test.'),
    );
  });

  tearDown(() => db.close());

  test('un APPLIED marque la ligne comme synchronisée (SENT)', () async {
    final String ref = await outbox.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.cashReceipt,
      payload: const {'amount': 15000},
    );
    when(() => remote.postBatch(any(), any())).thenAnswer((invocation) async {
      final input = invocation.positionalArguments[1] as SyncBatchInput;
      return _resultFor(input.batchRef, {ref: SyncOperationOutcome.applied});
    });

    await engine.runCycle('org-1', _config);

    final rows = await outbox.all('org-1');
    expect(rows.single.status, 'SENT');
  });

  test(
    'un REJECTED laisse la ligne visible avec un message en français',
    () async {
      final String ref = await outbox.enqueue(
        organizationId: 'org-1',
        type: OutboxOperationType.cashReceipt,
        payload: const {'amount': -1},
      );
      when(() => remote.postBatch(any(), any())).thenAnswer((invocation) async {
        final input = invocation.positionalArguments[1] as SyncBatchInput;
        return _resultFor(input.batchRef, {ref: SyncOperationOutcome.rejected});
      });

      await engine.runCycle('org-1', _config);

      final rows = await outbox.all('org-1');
      expect(rows.single.status, 'FAILED');
      expect(rows.single.lastErrorMessage, 'Montant invalide.');
    },
  );

  test('un CONFLICT laisse la ligne visible, réessai bloqué', () async {
    final String ref = await outbox.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.cashReceipt,
      payload: const {'amount': 15000},
    );
    when(() => remote.postBatch(any(), any())).thenAnswer((invocation) async {
      final input = invocation.positionalArguments[1] as SyncBatchInput;
      return _resultFor(input.batchRef, {ref: SyncOperationOutcome.conflict});
    });

    await engine.runCycle('org-1', _config);

    final rows = await outbox.all('org-1');
    expect(rows.single.status, 'CONFLICT');
    expect(await outbox.retryFromScreen(ref), isFalse);
  });

  test('un SKIPPED est remis en PENDING pour être réessayé', () async {
    final String ref = await outbox.enqueue(
      organizationId: 'org-1',
      type: OutboxOperationType.cashReceipt,
      payload: const {'amount': 15000},
    );
    when(() => remote.postBatch(any(), any())).thenAnswer((invocation) async {
      final input = invocation.positionalArguments[1] as SyncBatchInput;
      return _resultFor(input.batchRef, {ref: SyncOperationOutcome.skipped});
    });

    await engine.runCycle('org-1', _config);

    final rows = await outbox.all('org-1');
    expect(rows.single.status, 'PENDING');
  });
}
