import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:immodesk_mobile/features/portfolio/presentation/screens/unit_detail_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

const Map<String, dynamic> _unitDetailResponse = {
  'id': 'unit-1',
  'propertyId': 'prop-1',
  'code': 'A01',
  'label': 'Appartement A01',
  'unitType': 'APARTMENT',
  'status': 'OCCUPIED',
  'baseRentAmount': 150000,
  'baseChargesAmount': 10000,
  'property': {
    'id': 'prop-1',
    'code': 'IMM-01',
    'name': 'Résidence Malonga',
    'propertyType': 'APARTMENT_BUILDING',
    'district': 'Bacongo',
    'city': 'Brazzaville',
    'landlord': {
      'id': 'landlord-1',
      'displayName': 'Jean Malonga',
      'primaryPhone': '+242066000001',
      'isSelf': false,
    },
    'occupancy': {
      'unitsCount': 10,
      'occupiedCount': 8,
      'availableCount': 2,
      'occupancyRateBps': 8000,
    },
    'coverDocumentId': null,
  },
  'documents': <dynamic>[],
};

const Map<String, dynamic> _leaseSummaryJson = {
  'id': 'lease-1',
  'reference': 'BAIL-2026-00042',
  'status': 'ACTIVE',
  'unit': {'id': 'unit-1', 'code': 'A01', 'label': 'Appartement A01'},
  'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
  'tenant': {
    'id': 'tenant-1',
    'displayName': 'Alice Ndongo',
    'primaryPhone': '+242066000002',
  },
  'startDate': '2026-01-01',
  'endDate': null,
  'rentAmount': 150000,
  'chargesAmount': 10000,
  'paymentDueDay': 5,
};

void main() {
  late _MockDio mockDio;
  late AppDatabase database;

  setUp(() {
    mockDio = _MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());

    when(
      () =>
          mockDio.get<dynamic>('/units/unit-1', options: any(named: 'options')),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/units/unit-1'),
        statusCode: 200,
        data: _unitDetailResponse,
      ),
    );
    when(
      () => mockDio.get<dynamic>(
        '/documents',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/documents'),
        statusCode: 200,
        data: const {'items': <dynamic>[]},
      ),
    );
    when(
      () => mockDio.get<dynamic>(
        '/leases',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/leases'),
        statusCode: 200,
        data: {
          'items': [_leaseSummaryJson],
        },
      ),
    );
    when(
      () => mockDio.get<dynamic>(
        '/leases/lease-1',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/leases/lease-1'),
        statusCode: 200,
        data: _leaseSummaryJson,
      ),
    );
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
      child: const MaterialApp(home: UnitDetailScreen(unitId: 'unit-1')),
    );
  }

  testWidgets(
    'la fiche du lot affiche le bail actif (référence, statut, loyer)',
    (tester) async {
      await tester.pumpWidget(buildApp());
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(find.text('Bail actif'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('unit-active-lease-card')),
        findsOneWidget,
      );
      expect(find.text('BAIL-2026-00042'), findsOneWidget);
      expect(find.text('Actif'), findsOneWidget);

      verify(
        () => mockDio.get<dynamic>(
          '/leases',
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).called(1);
    },
  );

  testWidgets('affiche un message clair si aucun bail actif pour ce lot', (
    tester,
  ) async {
    when(
      () => mockDio.get<dynamic>(
        '/leases',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/leases'),
        statusCode: 200,
        data: const {'items': <dynamic>[]},
      ),
    );

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(find.text('Aucun bail actif pour ce lot.'), findsOneWidget);
    expect(find.byKey(const ValueKey('unit-active-lease-card')), findsNothing);
  });
}
