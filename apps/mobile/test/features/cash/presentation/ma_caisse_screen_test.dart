import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/auth/domain/entities/app_user.dart';
import 'package:immodesk_mobile/features/auth/presentation/controllers/auth_session_controller.dart';
import 'package:immodesk_mobile/features/cash/presentation/screens/ma_caisse_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

class _FakeAuthSessionController extends AuthSessionController {
  @override
  Future<AuthSessionState> build() async {
    return AuthSessionState(
      isAuthenticated: true,
      user: AppUser(
        id: 'user-1',
        phone: '+242066000001',
        fullName: 'Jean Collecteur',
        locale: 'fr-CG',
        timezone: 'Africa/Brazzaville',
        createdAt: DateTime(2026, 1, 1),
      ),
    );
  }
}

const Map<String, dynamic> _balanceResponse = {
  'userId': 'user-1',
  'fullName': 'Jean Collecteur',
  'heldAmount': 620000,
  'receiptsCount': 3,
  'oldestReceiptAt': '2026-09-01T08:00:00Z',
  'capAmount': 500000,
  'overCap': true,
  'lastRemittanceAt': null,
};

const Map<String, dynamic> _receiptsResponse = {
  'items': [
    {
      'id': 'receipt-1',
      'receiptNumber': 'CASH-ORG-COL-0001',
      'status': 'ISSUED',
      'amount': 60000,
      'receivedAt': '2026-09-01T08:00:00Z',
      'tenant': {'id': 'tenant-1', 'displayName': 'Alice Ndongo'},
      'collectorUserId': 'user-1',
      'collectorName': 'Jean Collecteur',
      'remittanceId': null,
      'paymentId': 'payment-1',
    },
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 200},
};

void main() {
  late _MockDio mockDio;

  setUp(() {
    mockDio = _MockDio();
    when(
      () => mockDio.get<dynamic>(
        '/cash/collectors/user-1/balance',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/cash/collectors/user-1/balance'),
        statusCode: 200,
        data: _balanceResponse,
      ),
    );
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

  Widget buildApp() {
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
        authSessionControllerProvider.overrideWith(
          _FakeAuthSessionController.new,
        ),
      ],
      child: const MaterialApp(home: MaCaisseScreen()),
    );
  }

  testWidgets("affiche l'encours, l'alerte de plafond et les reçus non remis", (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.byKey(const ValueKey('ma-caisse-balance')), findsOneWidget);
    expect(find.textContaining('Plafond dépassé'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('cash-receipt-tile-receipt-1')),
      findsOneWidget,
    );
    expect(find.text('CASH-ORG-COL-0001'), findsOneWidget);
  });
}
