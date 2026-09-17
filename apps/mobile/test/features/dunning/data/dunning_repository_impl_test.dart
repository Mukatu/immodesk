import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/api_exception.dart';
import 'package:immodesk_mobile/features/dunning/data/datasources/dunning_remote_data_source.dart';
import 'package:immodesk_mobile/features/dunning/data/repositories/dunning_repository_impl.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/dunning_run.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/dunning_step_status.dart';
import 'package:immodesk_mobile/features/dunning/domain/entities/notification_channel.dart';
import 'package:mocktail/mocktail.dart';

class _MockDunningRemoteDataSource extends Mock
    implements DunningRemoteDataSource {}

DunningRun _run({
  required String id,
  required String tenantId,
  required String scheduledAt,
  String? executedAt,
}) {
  return DunningRun(
    id: id,
    ruleId: 'rule-1',
    ruleName: 'Rappel à échéance',
    stepOrder: 1,
    status: DunningStepStatus.sent,
    runDate: scheduledAt.substring(0, 10),
    scheduledAt: scheduledAt,
    executedAt: executedAt,
    daysOverdue: 3,
    balanceAmount: 20000,
    channel: NotificationChannel.sms,
    tenant: DunningRunTenantRef(
      id: tenantId,
      displayName: 'Locataire $tenantId',
    ),
  );
}

void main() {
  late AppDatabase database;
  late _MockDunningRemoteDataSource remote;
  late DunningRepositoryImpl repository;

  setUp(() {
    database = AppDatabase.forTesting(NativeDatabase.memory());
    remote = _MockDunningRemoteDataSource();
    repository = DunningRepositoryImpl(remote, database);
  });

  tearDown(() => database.close());

  test(
    'filtre par locataire et trie du plus récent au plus ancien (dates ancrées)',
    () async {
      when(
        () => remote.fetchRuns(
          'org-1',
          invoiceId: null,
          cursor: null,
          limit: any(named: 'limit'),
        ),
      ).thenAnswer(
        (_) async => DunningRunsPage(
          items: [
            _run(
              id: 'run-old',
              tenantId: 'tenant-1',
              scheduledAt: '2026-01-05T08:00:00.000Z',
              executedAt: '2026-01-05T08:00:00.000Z',
            ),
            _run(
              id: 'run-other-tenant',
              tenantId: 'tenant-2',
              scheduledAt: '2026-01-20T08:00:00.000Z',
              executedAt: '2026-01-20T08:00:00.000Z',
            ),
            _run(
              id: 'run-recent',
              tenantId: 'tenant-1',
              scheduledAt: '2026-01-15T08:00:00.000Z',
              executedAt: '2026-01-15T08:00:00.000Z',
            ),
          ],
          nextCursor: null,
        ),
      );

      final result = await repository.fetchHistoryForTenant(
        organizationId: 'org-1',
        tenantId: 'tenant-1',
      );

      expect(result.isFromCache, isFalse);
      expect(result.data.map((r) => r.id).toList(), ['run-recent', 'run-old']);
    },
  );

  test('replie sur le cache local quand le réseau est indisponible', () async {
    when(
      () => remote.fetchRuns(
        'org-1',
        invoiceId: null,
        cursor: null,
        limit: any(named: 'limit'),
      ),
    ).thenAnswer(
      (_) async => DunningRunsPage(
        items: [
          _run(
            id: 'run-cached',
            tenantId: 'tenant-1',
            scheduledAt: '2026-02-01T08:00:00.000Z',
            executedAt: '2026-02-01T08:00:00.000Z',
          ),
        ],
        nextCursor: null,
      ),
    );
    await repository.fetchHistoryForTenant(
      organizationId: 'org-1',
      tenantId: 'tenant-1',
    );

    when(
      () => remote.fetchRuns(
        'org-1',
        invoiceId: null,
        cursor: null,
        limit: any(named: 'limit'),
      ),
    ).thenThrow(
      const ApiException(
        code: 'NETWORK.UNREACHABLE',
        message: 'Impossible de joindre le serveur.',
      ),
    );

    final result = await repository.fetchHistoryForTenant(
      organizationId: 'org-1',
      tenantId: 'tenant-1',
    );

    expect(result.isFromCache, isTrue);
    expect(result.data.single.id, 'run-cached');
    expect(result.cachedAt, isNotNull);
  });
}
