import 'dart:io';

import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/core/sync/sync_providers.dart';
import 'package:immodesk_mobile/features/meters/domain/entities/meter.dart';
import 'package:immodesk_mobile/features/meters/domain/entities/meter_type.dart';
import 'package:immodesk_mobile/features/meters/presentation/screens/meter_reading_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

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

class _FakePathProviderPlatform extends PathProviderPlatform
    with MockPlatformInterfaceMixin {
  _FakePathProviderPlatform(this.path);
  final String path;

  @override
  Future<String?> getApplicationDocumentsPath() async => path;
}

const Meter _meter = Meter(
  id: 'meter-1',
  propertyId: 'prop-1',
  unitId: 'unit-1',
  meterType: MeterType.waterLcde,
  serialNumber: 'CPT-EAU-045',
  digitsCount: 5,
  lastReading: MeterLastReading(readingDate: '2026-08-05', currentIndex: 1240),
);

void main() {
  late AppDatabase database;
  late Directory tempDir;

  setUp(() async {
    database = AppDatabase.forTesting(NativeDatabase.memory());
    tempDir = await Directory.systemTemp.createTemp('immodesk-meter-test');
    PathProviderPlatform.instance = _FakePathProviderPlatform(tempDir.path);
  });

  tearDown(() async {
    await database.close();
    if (await tempDir.exists()) await tempDir.delete(recursive: true);
  });

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: '${RoutePaths.meterSelection}/releve',
      routes: [
        GoRoute(
          path: RoutePaths.meterSelection,
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('COMPTEURS'))),
          routes: [
            GoRoute(
              path: 'releve',
              builder: (context, state) =>
                  const MeterReadingScreen(meter: _meter),
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
      child: MaterialApp(home: MaterialApp.router(routerConfig: router)),
    );
  }

  testWidgets('un index inférieur au précédent exige une décision explicite', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const ValueKey('meter-index-field')),
      '1180',
    );
    await tester.pump();

    expect(
      find.byKey(const ValueKey('meter-regression-banner')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('meter-submit-button')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('meter-regression-fix-button')),
      findsOneWidget,
    );
    expect((await database.select(database.outbox).get()), isEmpty);

    await tester.tap(
      find.byKey(const ValueKey('meter-regression-rollover-button')),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('meter-regression-banner')), findsNothing);

    await tester.runAsync(() async {
      await tester.tap(find.byKey(const ValueKey('meter-submit-button')));
      for (int attempt = 0; attempt < 40; attempt++) {
        final rows = await database.select(database.outbox).get();
        if (rows.isNotEmpty) break;
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
    });
    await tester.pumpAndSettle();

    final rows = await database.select(database.outbox).get();
    expect(rows, hasLength(1));
    expect(rows.single.operation, 'METER_READING');
    expect(rows.single.payload, contains('"rolloverApplied":true'));
  });
}
