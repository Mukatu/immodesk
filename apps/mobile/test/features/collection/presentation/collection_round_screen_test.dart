import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/format/money_xaf.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/collection/presentation/screens/collection_round_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
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
  });

  tearDown(() => database.close());

  Widget buildApp() {
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        appDatabaseProvider.overrideWithValue(database),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
      ],
      child: const MaterialApp(home: CollectionRoundScreen()),
    );
  }

  testWidgets('affiche la tournée regroupée par immeuble avec le total dû', (
    tester,
  ) async {
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

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Résidence Malonga'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('collection-round-summary')),
      findsOneWidget,
    );
    expect(find.textContaining(formatXaf(60000)), findsWidgets);
  });

  testWidgets('affiche un état vide sans facture due', (tester) async {
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
        data: const {
          'items': [],
          'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 200},
        },
      ),
    );

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Aucune facture due'), findsOneWidget);
  });
}
