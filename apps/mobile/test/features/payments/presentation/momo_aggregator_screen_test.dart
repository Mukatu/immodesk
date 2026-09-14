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
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:immodesk_mobile/features/payments/data/payments_providers.dart';
import 'package:immodesk_mobile/features/payments/presentation/screens/momo_aggregator_screen.dart';
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

Future<void> _pumpTicks(WidgetTester tester, [int count = 10]) async {
  for (int i = 0; i < count; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

const Map<String, dynamic> _invoicesResponse = {
  'items': [
    {
      'id': 'inv-1',
      'invoiceNumber': 'LOY-202601-0001',
      'status': 'ISSUED',
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
      'totalAmount': 50000,
      'paidAmount': 0,
      'balanceAmount': 50000,
    },
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 200},
};

const Map<String, dynamic> _quoteResponse = {
  'amount': 50000,
  'feeAmount': 1500,
  'totalDebited': 51500,
  'netReceived': 50000,
  'feeBearer': 'TENANT',
};

Map<String, dynamic> _initiateResponse(String clientRef) => {
  'transaction': {
    'id': 'tx-1',
    'channel': 'AGGREGATOR',
    'status': 'INITIATED',
    'provider': 'MTN_MOMO',
    'payerMsisdn': '+242066222222',
    'amount': 50000,
    'clientRef': clientRef,
  },
  'payment': {'id': 'pay-1', 'status': 'PENDING'},
};

Map<String, dynamic> _transactionStatus(String status) => {
  'id': 'tx-1',
  'channel': 'AGGREGATOR',
  'status': status,
  'provider': 'MTN_MOMO',
  'payerMsisdn': '+242066222222',
  'amount': 50000,
  'failureMessage': status == 'FAILED' ? 'Solde insuffisant' : null,
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
    when(
      () => mockDio.post<dynamic>(
        '/payments/mobile-money/quote',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/payments/mobile-money/quote'),
        statusCode: 200,
        data: _quoteResponse,
      ),
    );
    when(
      () => mockDio.post<dynamic>(
        '/payments/mobile-money/initiate',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).thenAnswer((invocation) async {
      final Map<String, dynamic> body =
          invocation.namedArguments[#data] as Map<String, dynamic>;
      return Response<dynamic>(
        requestOptions: RequestOptions(path: '/payments/mobile-money/initiate'),
        statusCode: 202,
        data: _initiateResponse(body['clientRef'] as String),
      );
    });
  });

  tearDown(() => database.close());

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: RoutePaths.momoAggregator('inv-1'),
      routes: [
        GoRoute(
          path: RoutePaths.momoAggregatorPattern,
          builder: (context, state) => MomoAggregatorScreen(
            invoiceId: state.pathParameters['invoiceId']!,
          ),
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
        momoPollIntervalProvider.overrideWithValue(
          const Duration(milliseconds: 30),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  Future<void> goToWaiting(WidgetTester tester) async {
    await tester.pumpWidget(buildApp());
    await _pumpTicks(tester);
    await tester.enterText(
      find.byKey(const ValueKey('momo-aggregator-msisdn-field')),
      '066222222',
    );
    await tester.pump();
    await tester.tap(
      find.byKey(const ValueKey('momo-aggregator-quote-button')),
    );
    await _pumpTicks(tester);
    await tester.tap(
      find.byKey(const ValueKey('momo-aggregator-confirm-button')),
    );
    // Un seul pump (sans avancer le temps réel) : l'initiation se résout
    // immédiatement (pas de délai dans le mock), mais le minuteur
    // d'interrogation (`momoPollIntervalProvider`, 30 ms en test) n'a pas
    // encore eu l'occasion de se déclencher.
    await tester.pump();
    await tester.pump();
    expect(
      find.byKey(const ValueKey('momo-aggregator-waiting-message')),
      findsOneWidget,
    );
  }

  testWidgets('attente puis succès affiche la quittance', (tester) async {
    when(
      () => mockDio.get<dynamic>(
        '/payments/mobile-money/transactions/tx-1',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(
          path: '/payments/mobile-money/transactions/tx-1',
        ),
        statusCode: 200,
        data: _transactionStatus('SUCCEEDED'),
      ),
    );

    await goToWaiting(tester);
    await tester.pump(const Duration(milliseconds: 60));
    await _pumpTicks(tester, 15);

    expect(
      find.byKey(const ValueKey('momo-aggregator-success-title')),
      findsOneWidget,
    );
  });

  testWidgets('attente puis expiration propose une nouvelle tentative', (
    tester,
  ) async {
    when(
      () => mockDio.get<dynamic>(
        '/payments/mobile-money/transactions/tx-1',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(
          path: '/payments/mobile-money/transactions/tx-1',
        ),
        statusCode: 200,
        data: _transactionStatus('EXPIRED'),
      ),
    );

    await goToWaiting(tester);
    await tester.pump(const Duration(milliseconds: 60));
    await _pumpTicks(tester, 15);

    expect(
      find.byKey(const ValueKey('momo-aggregator-expired-title')),
      findsOneWidget,
    );

    await tester.tap(
      find.byKey(const ValueKey('momo-aggregator-retry-button')),
    );
    await _pumpTicks(tester);

    expect(
      find.byKey(const ValueKey('momo-aggregator-input-form')),
      findsOneWidget,
    );
  });
}
