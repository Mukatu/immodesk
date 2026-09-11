import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/features/cash/presentation/screens/remittance_creation_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

const Map<String, dynamic> _receiptsResponse = {
  'items': [
    {
      'id': 'receipt-1',
      'receiptNumber': 'CASH-ORG-COL-0001',
      'status': 'ISSUED',
      'amount': 20000,
      'receivedAt': '2026-09-01T08:00:00Z',
      'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
      'collectorUserId': 'user-1',
      'collectorName': 'Jean Collecteur',
      'remittanceId': null,
      'paymentId': 'payment-1',
    },
    {
      'id': 'receipt-2',
      'receiptNumber': 'CASH-ORG-COL-0002',
      'status': 'ISSUED',
      'amount': 15000,
      'receivedAt': '2026-09-02T08:00:00Z',
      'tenant': {'id': 'tenant-2', 'displayName': 'Bruno Mabiala'},
      'collectorUserId': 'user-1',
      'collectorName': 'Jean Collecteur',
      'remittanceId': null,
      'paymentId': 'payment-2',
    },
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 200},
};

const Map<String, dynamic> _remittanceResponse = {
  'id': 'remittance-1',
  'reference': 'REM-202609-0001',
  'status': 'SUBMITTED',
  'collectorUserId': 'user-1',
  'collectorName': 'Jean Collecteur',
  'declaredAmount': 35000,
  'expectedAmount': 35000,
  'countedAmount': 0,
  'varianceAmount': 0,
  'receiptsCount': 2,
  'openedAt': '2026-09-11T10:00:00Z',
  'submittedAt': '2026-09-11T10:00:00Z',
  'verifiedAt': null,
};

void main() {
  late _MockDio mockDio;

  setUp(() {
    mockDio = _MockDio();
    when(
      () => mockDio.get<dynamic>(
        '/cash-receipts',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/cash-receipts'),
        statusCode: 200,
        data: _receiptsResponse,
      ),
    );
  });

  ({Widget widget, GoRouter router}) buildApp() {
    final router = GoRouter(
      initialLocation: RoutePaths.cashHome,
      routes: [
        GoRoute(
          path: RoutePaths.cashHome,
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('MA_CAISSE'))),
          routes: [
            GoRoute(
              path: 'remittances/new',
              builder: (context, state) => const RemittanceCreationScreen(),
            ),
          ],
        ),
      ],
    );
    final Widget widget = ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
    return (widget: widget, router: router);
  }

  testWidgets('présélectionne tous les reçus non remis et soumet la remise', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 4000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    when(
      () => mockDio.post<dynamic>(
        '/cash-remittances',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/cash-remittances'),
        statusCode: 201,
        data: _remittanceResponse,
      ),
    );

    final app = buildApp();
    await tester.pumpWidget(app.widget);
    await tester.pump();
    app.router.push(RoutePaths.cashRemittanceNew);
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(
      find.byKey(const ValueKey('remittance-receipt-checkbox-receipt-1')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('remittance-receipt-checkbox-receipt-2')),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('submit-remittance-button')));
    await tester.pump();
    await tester.pump();

    verify(
      () => mockDio.post<dynamic>(
        '/cash-remittances',
        data: any(named: 'data'),
        options: any(named: 'options'),
      ),
    ).called(1);
  });
}
