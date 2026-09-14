import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/sync/outbox_watch.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:immodesk_mobile/features/sync/presentation/screens/outbox_screen.dart';

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

class _OfflineConnectivityService extends ConnectivityService {
  const _OfflineConnectivityService();

  @override
  Future<bool> isOffline() async => true;
}

void main() {
  late AppDatabase database;

  setUp(() => database = AppDatabase.forTesting(NativeDatabase.memory()));
  tearDown(() => database.close());

  Future<List<OutboxRow>> seed() async {
    await database
        .into(database.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: 'ref-pending',
            organizationId: 'org-1',
            operation: 'CASH_RECEIPT',
            payload: '{"amount":15000}',
          ),
        );
    await database
        .into(database.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: 'ref-failed',
            organizationId: 'org-1',
            operation: 'CASH_RECEIPT',
            payload: '{"amount":5000}',
            status: const Value('FAILED'),
            lastErrorMessage: const Value('Montant invalide.'),
          ),
        );
    await database
        .into(database.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: 'ref-conflict',
            organizationId: 'org-1',
            operation: 'CASH_RECEIPT',
            payload: '{"amount":20000}',
            status: const Value('CONFLICT'),
            lastErrorMessage: const Value('La facture a été annulée.'),
          ),
        );
    return database.select(database.outbox).get();
  }

  // `outboxWatchProvider` en flux figé (snapshot) plutôt que branché sur
  // `AppDatabase.watch()` : le flux Drift réel programme, à son
  // annulation, une minuterie interne (`StreamQueryStore`) que
  // `flutter_test` détecte comme « encore en attente » à la fin du test.
  // Les écrans n'ont pas besoin de réactivité pour ces assertions : le
  // test de nouvelle tentative vérifie l'écriture directement en base.
  Widget buildApp(List<OutboxRow> rows) {
    return ProviderScope(
      overrides: [
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        connectivityServiceProvider.overrideWithValue(
          const _OfflineConnectivityService(),
        ),
        outboxWatchProvider(
          'org-1',
        ).overrideWith((ref) => Stream<List<OutboxRow>>.value(rows)),
      ],
      child: const MaterialApp(home: OutboxScreen()),
    );
  }

  testWidgets('liste les éléments de l\'outbox avec leur statut', (
    tester,
  ) async {
    final List<OutboxRow> rows = await seed();
    await tester.pumpWidget(buildApp(rows));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('outbox-list')), findsOneWidget);
    expect(find.text('En attente'), findsOneWidget);
    expect(find.text('Échec'), findsOneWidget);
    expect(find.text('Conflit'), findsOneWidget);
  });

  testWidgets('affiche une explication de conflit sans bouton de relance', (
    tester,
  ) async {
    final List<OutboxRow> rows = await seed();
    await tester.pumpWidget(buildApp(rows));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('outbox-item-ref-conflict')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('outbox-detail-conflict-explanation')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('outbox-detail-retry-button')),
      findsNothing,
    );
  });

  testWidgets('une nouvelle tentative remet un échec en attente', (
    tester,
  ) async {
    final List<OutboxRow> rows = await seed();
    await tester.pumpWidget(buildApp(rows));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('outbox-item-ref-failed')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('outbox-detail-error-message')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('outbox-detail-retry-button')));
    await tester.pumpAndSettle();

    final OutboxRow row = await (database.select(
      database.outbox,
    )..where((t) => t.clientRef.equals('ref-failed'))).getSingle();
    expect(row.status, 'PENDING');
  });
}
