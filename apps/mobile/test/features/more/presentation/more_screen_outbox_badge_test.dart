import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/sync/outbox_watch.dart';
import 'package:immodesk_mobile/features/more/presentation/screens/more_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/current_role_controller.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

void main() {
  late AppDatabase database;

  setUp(() => database = AppDatabase.forTesting(NativeDatabase.memory()));
  tearDown(() => database.close());

  Widget buildApp(List<OutboxRow> rows) {
    return ProviderScope(
      overrides: [
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        // Le rôle courant traverse la session d'authentification complète
        // (jeton de rafraîchissement, `/v1/me`), hors sujet ici : on fixe
        // directement un rôle non-démarcheur pour isoler le badge.
        isCollectorModeProvider.overrideWith((ref) async => false),
        outboxWatchProvider(
          'org-1',
        ).overrideWith((ref) => Stream<List<OutboxRow>>.value(rows)),
      ],
      child: const MaterialApp(home: MoreScreen()),
    );
  }

  testWidgets('badge masqué sans élément en attente', (tester) async {
    await tester.pumpWidget(buildApp(const []));
    await tester.pumpAndSettle();

    final Badge badge = tester.widget<Badge>(
      find.byKey(const ValueKey('outbox-badge')),
    );
    expect(badge.isLabelVisible, isFalse);
  });

  testWidgets('badge affiche le nombre d\'éléments en attente', (tester) async {
    await database
        .into(database.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: 'ref-1',
            organizationId: 'org-1',
            operation: 'CASH_RECEIPT',
            payload: '{"amount":1000}',
          ),
        );
    await database
        .into(database.outbox)
        .insert(
          OutboxCompanion.insert(
            clientRef: 'ref-2',
            organizationId: 'org-1',
            operation: 'CASH_RECEIPT',
            payload: '{"amount":2000}',
            status: const Value('SENDING'),
          ),
        );
    final List<OutboxRow> rows = await database.select(database.outbox).get();

    await tester.pumpWidget(buildApp(rows));
    await tester.pumpAndSettle();

    final Badge badge = tester.widget<Badge>(
      find.byKey(const ValueKey('outbox-badge')),
    );
    expect(badge.isLabelVisible, isTrue);
    expect(find.text('2'), findsOneWidget);
  });
}
