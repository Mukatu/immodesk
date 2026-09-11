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

class _OnlineConnectivityService extends ConnectivityService {
  const _OnlineConnectivityService();

  @override
  Future<bool> isOffline() async => false;
}

/// Pompe un nombre borné de frames courtes : `pumpAndSettle` n'est pas
/// utilisable ici, un `CircularProgressIndicator` indéterminé (pendant
/// `isSubmitting`) l'empêcherait de jamais se stabiliser (même pattern que
/// `lease_documents_section_test.dart`).
Future<void> _pumpTicks(WidgetTester tester, [int count = 6]) async {
  for (int i = 0; i < count; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
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

Map<String, dynamic> _cashReceiptResponse(String clientRef) => {
  'id': 'receipt-1',
  'receiptNumber': 'CASH-ORG-COL-0001',
  'status': 'ISSUED',
  'amount': 60000,
  'receivedAt': '2026-09-11T10:00:00Z',
  'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
  'documentId': null,
  'clientRef': clientRef,
};

void main() {
  late _MockDio mockDio;
  late AppDatabase database;

  setUp(() {
    mockDio = _MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());
    when(
      () => mockDio.get<dynamic>(
        '/invoices',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/invoices'),
        statusCode: 200,
        data: _invoicesResponse,
      ),
    );
  });

  tearDown(() => database.close());

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
          path: RoutePaths.collectionConfirmationPattern,
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('CONFIRMATION'))),
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
          const _OnlineConnectivityService(),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  /// Agrandit la fenêtre de test pour que le formulaire (assez long : en-tête,
  /// factures, montant, aperçu d'imputation, pavé de signature, bouton)
  /// tienne en entier sans défilement — sinon la `ListView` ne construit
  /// pas encore le bouton « Valider », hors de la zone visible + tampon.
  void useTallTestViewport(WidgetTester tester) {
    tester.view.physicalSize = const Size(1000, 4000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets(
    "un double appui sur Valider ne déclenche qu'un seul appel réseau",
    (tester) async {
      useTallTestViewport(tester);
      when(
        () => mockDio.post<dynamic>(
          '/cash-receipts',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((invocation) async {
        final Map<String, dynamic> body =
            invocation.namedArguments[#data] as Map<String, dynamic>;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return Response<dynamic>(
          requestOptions: RequestOptions(path: '/cash-receipts'),
          statusCode: 201,
          data: _cashReceiptResponse(body['clientRef'] as String),
        );
      });

      await tester.pumpWidget(buildApp());
      await _pumpTicks(tester);

      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(EncaissementScreen)),
      );
      container
          .read(encaissementControllerProvider('inv-1').notifier)
          .setSignature(Uint8List.fromList(const [1, 2, 3]));
      await tester.pump();

      final String initialClientRef = container
          .read(encaissementControllerProvider('inv-1'))
          .value!
          .clientRef;

      final Finder submitButton = find.byKey(
        const ValueKey('submit-encaissement-button'),
      );
      await tester.tap(submitButton);
      await tester.tap(submitButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      verify(
        () => mockDio.post<dynamic>(
          '/cash-receipts',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).called(1);
      expect(
        container
            .read(encaissementControllerProvider('inv-1'))
            .value!
            .result!
            .clientRef,
        initialClientRef,
      );
    },
  );

  testWidgets(
    'conserve le même clientRef entre deux tentatives après un échec',
    (tester) async {
      useTallTestViewport(tester);
      int callCount = 0;
      final List<String> capturedClientRefs = [];
      when(
        () => mockDio.post<dynamic>(
          '/cash-receipts',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((invocation) async {
        final Map<String, dynamic> body =
            invocation.namedArguments[#data] as Map<String, dynamic>;
        capturedClientRefs.add(body['clientRef'] as String);
        callCount += 1;
        if (callCount == 1) {
          throw DioException(
            requestOptions: RequestOptions(path: '/cash-receipts'),
            type: DioExceptionType.connectionError,
          );
        }
        return Response<dynamic>(
          requestOptions: RequestOptions(path: '/cash-receipts'),
          statusCode: 201,
          data: _cashReceiptResponse(body['clientRef'] as String),
        );
      });

      await tester.pumpWidget(buildApp());
      await _pumpTicks(tester);

      final ProviderContainer container = ProviderScope.containerOf(
        tester.element(find.byType(EncaissementScreen)),
      );
      container
          .read(encaissementControllerProvider('inv-1').notifier)
          .setSignature(Uint8List.fromList(const [1, 2, 3]));
      await tester.pump();

      final Finder submitButton = find.byKey(
        const ValueKey('submit-encaissement-button'),
      );
      await tester.tap(submitButton);
      await tester.pump();
      await tester.pump();

      await tester.tap(submitButton);
      await tester.pump();
      await tester.pump();

      expect(capturedClientRefs, hasLength(2));
      expect(capturedClientRefs[0], capturedClientRefs[1]);
    },
  );
}
