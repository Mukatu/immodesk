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
import 'package:immodesk_mobile/features/payments/presentation/screens/momo_declaration_screen.dart';
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

const Map<String, dynamic> _paymentInstructionsResponse = {
  'transferReference': 'LOY-202601-0001',
  'bankAccounts': [],
  'mobileMoneyNumbers': [
    {
      'bankAccountId': 'bank-1',
      'provider': 'MTN_MOMO',
      'msisdn': '+242066111111',
      'holderName': 'Agence Malonga',
    },
  ],
  'aggregatorAvailable': false,
};

Map<String, dynamic> _declarationResponse(String clientRef) => {
  'id': 'momo-1',
  'channel': 'DECLARED',
  'status': 'DECLARED',
  'provider': 'MTN_MOMO',
  'payerMsisdn': '+242066222222',
  'payeeMsisdn': '+242066111111',
  'amount': 50000,
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
    when(
      () => mockDio.get<dynamic>(
        '/invoices/inv-1/payment-instructions',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(
          path: '/invoices/inv-1/payment-instructions',
        ),
        statusCode: 200,
        data: _paymentInstructionsResponse,
      ),
    );
  });

  tearDown(() => database.close());

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: RoutePaths.momoDeclaration('inv-1'),
      routes: [
        GoRoute(
          path: RoutePaths.momoDeclarationPattern,
          builder: (context, state) => MomoDeclarationScreen(
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
    "un double appui sur Déclarer ne déclenche qu'un seul appel réseau",
    (tester) async {
      useTallTestViewport(tester);
      when(
        () => mockDio.post<dynamic>(
          '/payments/mobile-money/declarations',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((invocation) async {
        final Map<String, dynamic> body =
            invocation.namedArguments[#data] as Map<String, dynamic>;
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return Response<dynamic>(
          requestOptions: RequestOptions(
            path: '/payments/mobile-money/declarations',
          ),
          statusCode: 201,
          data: _declarationResponse(body['clientRef'] as String),
        );
      });

      await tester.pumpWidget(buildApp());
      await _pumpTicks(tester);

      await tester.enterText(
        find.byKey(const ValueKey('momo-payer-msisdn-field')),
        '+242066222222',
      );
      await tester.enterText(
        find.byKey(const ValueKey('momo-operator-reference-field')),
        'mp240101.1234.a56789',
      );
      await tester.pump();

      final Finder submitButton = find.byKey(
        const ValueKey('submit-momo-declaration-button'),
      );
      await tester.tap(submitButton);
      await tester.tap(submitButton);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      verify(
        () => mockDio.post<dynamic>(
          '/payments/mobile-money/declarations',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).called(1);

      await _pumpTicks(tester);
      expect(
        find.byKey(const ValueKey('momo-declaration-pending-message')),
        findsOneWidget,
      );
    },
  );
}
