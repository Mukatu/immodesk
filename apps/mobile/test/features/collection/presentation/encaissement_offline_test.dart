import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/features/collection/presentation/controllers/encaissement_controller.dart';
import 'package:immodesk_mobile/features/collection/presentation/screens/encaissement_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

/// Mode avion : toutes les vérifications de connectivité de l'application
/// (contrôleur d'encaissement, `SyncCoordinator`) doivent traiter
/// l'appareil comme hors ligne.
class _OfflineConnectivityService extends ConnectivityService {
  const _OfflineConnectivityService();

  @override
  Future<bool> isOffline() async => true;
}

const Map<String, dynamic> _invoicesResponse = {
  'items': [
    {
      'id': 'inv-1',
      'invoiceNumber': 'LOY-202601-0001',
      'status': 'OVERDUE',
      'lease': {'id': 'lease-1', 'reference': 'BAIL-1'},
      'tenant': {
        'id': 'tenant-1',
        'displayName': 'Alice Ndongo',
        'primaryPhone': '+242066000002',
      },
      'unit': {'id': 'unit-1', 'code': 'A01'},
      'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
      'periodStart': '2026-01-01',
      'periodEnd': '2026-01-31',
      'dueDate': '2026-01-05',
      'graceUntilDate': '2026-01-10',
      'totalAmount': 60000,
      'paidAmount': 0,
      'balanceAmount': 60000,
    },
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 200},
};

void main() {
  late _MockDio mockDio;
  late AppDatabase database;

  setUp(() {
    mockDio = _MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());
    // Le premier appel réseau échoue (mode avion) : le dépôt se replie sur
    // le cache Drift. On préremplit donc le cache directement, comme le
    // ferait un préchargement de tournée réussi avant le départ.
    when(
      () => mockDio.get<dynamic>(
        '/invoices',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/invoices'),
        type: DioExceptionType.connectionError,
      ),
    );
  });

  tearDown(() => database.close());

  Future<void> seedCache() async {
    final Map<String, dynamic> invoiceJson =
        (_invoicesResponse['items'] as List).first as Map<String, dynamic>;
    await database.replaceCachedInvoicesForOrganization('org-1', [
      CachedInvoiceRow(
        id: 'inv-1',
        organizationId: 'org-1',
        leaseId: 'lease-1',
        propertyId: 'prop-1',
        dueDate: '2026-01-05',
        payload: jsonEncode(invoiceJson),
        cachedAt: DateTime.now(),
      ),
    ]);
  }

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: RoutePaths.collectionEncaissement('inv-1'),
      routes: [
        GoRoute(
          path: RoutePaths.collectionEncaissementPattern,
          builder: (context, state) =>
              const EncaissementScreen(invoiceId: 'inv-1'),
        ),
        GoRoute(
          path: RoutePaths.collectionRound,
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('TOURNEE'))),
        ),
      ],
    );

    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        connectivityServiceProvider.overrideWithValue(
          const _OfflineConnectivityService(),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  void useTallTestViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(1000, 4000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets(
    'un encaissement créé en mode avion est versé à l\'outbox, sans appel réseau',
    (tester) async {
      useTallTestViewport(tester);
      await seedCache();

      await tester.pumpWidget(buildApp());
      await tester.pumpAndSettle();

      // Bandeau hors ligne visible, formulaire non bloqué.
      expect(find.byKey(const ValueKey('offline-data-banner')), findsOneWidget);
      expect(find.byKey(const ValueKey('encaissement-form')), findsOneWidget);

      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(EncaissementScreen)),
      );
      container
          .read(encaissementControllerProvider('inv-1').notifier)
          .setSignature(Uint8List.fromList(const [1, 2, 3]));
      await tester.pump();

      final String clientRef = container
          .read(encaissementControllerProvider('inv-1'))
          .value!
          .clientRef;

      await tester.tap(
        find.byKey(const ValueKey('submit-encaissement-button')),
      );
      await tester.pumpAndSettle();

      // Aucun appel réseau vers la route en ligne des encaissements.
      verifyNever(
        () => mockDio.post<dynamic>(
          '/cash-receipts',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      );

      final List<OutboxRow> rows = await database.select(database.outbox).get();
      expect(rows, hasLength(1));
      expect(rows.single.clientRef, clientRef);
      expect(rows.single.operation, 'CASH_RECEIPT');
      expect(rows.single.status, 'PENDING');

      // Retour à la tournée avec confirmation visible.
      expect(find.text('TOURNEE'), findsOneWidget);
      expect(find.text(EncaissementState.queuedOfflineMessage), findsOneWidget);
    },
  );
}
