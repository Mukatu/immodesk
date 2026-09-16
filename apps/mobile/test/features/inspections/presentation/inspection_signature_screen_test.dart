import 'dart:io';
import 'dart:typed_data';

import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/core/sync/sync_providers.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_condition.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_item_draft.dart';
import 'package:immodesk_mobile/features/inspections/domain/entities/inspection_type.dart';
import 'package:immodesk_mobile/features/inspections/presentation/controllers/inspection_flow_controller.dart';
import 'package:immodesk_mobile/features/inspections/presentation/screens/inspection_signature_screen.dart';
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

/// `SyncCoordinator.build()` écoute le vrai `Connectivity()` de
/// `connectivity_plus`, indisponible en test (`MissingPluginException`).
/// Ce faux ne fait rien : le déclenchement de synchronisation après une
/// mise en attente hors ligne est déjà couvert par `sync_engine_test.dart`.
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

void main() {
  late AppDatabase database;
  late Directory tempDir;

  setUp(() async {
    database = AppDatabase.forTesting(NativeDatabase.memory());
    tempDir = await Directory.systemTemp.createTemp('immodesk-inspection-test');
    PathProviderPlatform.instance = _FakePathProviderPlatform(tempDir.path);
  });

  tearDown(() async {
    await database.close();
    if (await tempDir.exists()) await tempDir.delete(recursive: true);
  });

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: RoutePaths.inspectionSignature,
      routes: [
        GoRoute(
          path: RoutePaths.inspectionSignature,
          builder: (context, state) => const InspectionSignatureScreen(),
        ),
        GoRoute(
          path: RoutePaths.more,
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('PLUS'))),
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
    'un poste dégradé sans photo bloque la signature avec un message clair',
    (tester) async {
      await tester.pumpWidget(buildApp());
      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(InspectionSignatureScreen)),
      );
      final notifier = container.read(
        inspectionFlowControllerProvider.notifier,
      );
      notifier.start(unitId: 'unit-1', inspectionType: InspectionType.moveOut);
      notifier.setTenantPresent(false);
      notifier.setAbsenceReason('Voyage');
      notifier.addItem(
        const InspectionItemDraft(
          localId: 'item-1',
          roomLabel: 'Salon',
          elementLabel: 'Peinture',
          condition: InspectionCondition.damaged,
        ),
      );
      await tester.pump();

      expect(
        find.byKey(const ValueKey('inspection-readiness-banner')),
        findsOneWidget,
      );

      await tester.tap(find.byKey(const ValueKey('inspection-sign-button')));
      await tester.pumpAndSettle();

      // Aucune écriture dans l'outbox : la signature a été refusée.
      final rows = await database.select(database.outbox).get();
      expect(rows, isEmpty);
    },
  );

  testWidgets(
    'une signature valide met l\'état des lieux en attente hors ligne',
    (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pumpAndSettle();
      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(InspectionSignatureScreen)),
      );
      // Force la résolution de l'organisation sélectionnée avant la
      // signature : rien dans cet écran ne la lit plus tôt (contrairement à
      // l'encaissement, dont le contrôleur l'attend dès son `build`).
      await container.read(selectedOrganizationControllerProvider.future);
      final notifier = container.read(
        inspectionFlowControllerProvider.notifier,
      );
      notifier.start(unitId: 'unit-1', inspectionType: InspectionType.moveIn);
      notifier.setTenantPresent(false);
      notifier.setAbsenceReason('Voyage');
      notifier.addItem(
        const InspectionItemDraft(
          localId: 'item-1',
          roomLabel: 'Salon',
          elementLabel: 'Peinture',
          condition: InspectionCondition.good,
        ),
      );
      // La capture réelle du tracé (rendu Skia) n'est pas exerçable en test
      // de widget sans surface graphique : comme pour l'encaissement
      // (`EncaissementController.setSignature`), on injecte directement les
      // octets au niveau du contrôleur, exactement ce que fait `onDrawEnd`
      // en production une fois le tracé terminé.
      notifier.setAgentSignature(Uint8List.fromList(const [1, 2, 3]));
      await tester.pumpAndSettle();

      // La signature met en attente via de vraies E/S (`dart:io`, écriture
      // du fichier local) : `runAsync` laisse le vrai event loop les faire
      // progresser (un simple `pump()`, en zone de temps simulé, ne suffit
      // pas — voir `unit_photo_capture_offline_test.dart`).
      await tester.runAsync(() async {
        await tester.tap(find.byKey(const ValueKey('inspection-sign-button')));
        for (int attempt = 0; attempt < 40; attempt++) {
          final rows = await database.select(database.outbox).get();
          if (rows.isNotEmpty) break;
          await Future<void>.delayed(const Duration(milliseconds: 50));
        }
      });
      await tester.pumpAndSettle();

      final rows = await database.select(database.outbox).get();
      // Une opération DOCUMENT (signature agence) et une INSPECTION_SUBMIT.
      expect(rows.map((r) => r.operation).toSet(), {
        'DOCUMENT',
        'INSPECTION_SUBMIT',
      });
      expect(find.text('PLUS'), findsOneWidget);
    },
  );
}
