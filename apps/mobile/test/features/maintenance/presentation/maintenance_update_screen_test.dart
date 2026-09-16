import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/sync/sync_providers.dart';
import 'package:immodesk_mobile/features/maintenance/presentation/screens/maintenance_update_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';

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

class _NoopSyncCoordinator extends SyncCoordinator {
  @override
  void build() {}

  @override
  Future<void> triggerSync() async {}
}

void main() {
  late AppDatabase database;

  setUp(() {
    database = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() => database.close());

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: '/detail/mise-a-jour',
      routes: [
        GoRoute(
          path: '/detail',
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('DETAIL'))),
          routes: [
            GoRoute(
              path: 'mise-a-jour',
              builder: (context, state) =>
                  const MaintenanceUpdateScreen(requestId: 'mnt-1'),
            ),
          ],
        ),
      ],
    );
    return ProviderScope(
      overrides: [
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        connectivityServiceProvider.overrideWithValue(
          const _OfflineConnectivityService(),
        ),
        syncCoordinatorProvider.overrideWith(_NoopSyncCoordinator.new),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  testWidgets(
    'une mise à jour hors ligne est versée à l\'outbox avec le changement de statut',
    (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const ValueKey('maintenance-update-message-field')),
        'Intervention en cours sur place.',
      );
      await tester.tap(
        find.byKey(const ValueKey('maintenance-update-status-field')),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('En cours').last);
      await tester.pumpAndSettle();

      await tester.tap(
        find.byKey(const ValueKey('maintenance-update-submit-button')),
      );
      await tester.pumpAndSettle();

      final rows = await database.select(database.outbox).get();
      expect(rows, hasLength(1));
      expect(rows.single.operation, 'MAINTENANCE_UPDATE');
      final payload = jsonDecode(rows.single.payload) as Map<String, dynamic>;
      expect(payload['newStatus'], 'IN_PROGRESS');
      expect(payload['message'], 'Intervention en cours sur place.');
      expect(payload['requestId'], 'mnt-1');
    },
  );
}
