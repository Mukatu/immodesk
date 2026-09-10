import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:immodesk_mobile/features/portfolio/presentation/screens/properties_list_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

const Map<String, dynamic> _propertiesResponse = {
  'items': [
    {
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
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 100},
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
      child: const MaterialApp(home: PropertiesListScreen()),
    );
  }

  testWidgets("affiche la liste des immeubles avec le taux d'occupation", (
    tester,
  ) async {
    when(
      () => mockDio.get<dynamic>(
        '/properties',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/properties'),
        statusCode: 200,
        data: _propertiesResponse,
      ),
    );

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Résidence Malonga'), findsOneWidget);
    expect(find.text('8/10 lots occupés'), findsOneWidget);
    expect(find.byKey(const ValueKey('offline-data-banner')), findsNothing);
  });

  testWidgets('bascule sur le cache local et affiche le bandeau hors ligne', (
    tester,
  ) async {
    when(
      () => mockDio.get<dynamic>(
        '/properties',
        queryParameters: any(named: 'queryParameters'),
        options: any(named: 'options'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/properties'),
        type: DioExceptionType.connectionError,
      ),
    );

    await database.replaceCachedProperties('org-1', [
      CachedPropertyRow(
        id: 'prop-1',
        organizationId: 'org-1',
        name: 'Résidence Malonga',
        city: 'Brazzaville',
        payload:
            '{"id":"prop-1","code":"IMM-01","name":"Résidence Malonga",'
            '"propertyType":"APARTMENT_BUILDING","district":"Bacongo",'
            '"city":"Brazzaville","landlord":{"id":"landlord-1",'
            '"displayName":"Jean Malonga","primaryPhone":"+242066000001",'
            '"isSelf":false},"occupancy":{"unitsCount":10,'
            '"occupiedCount":8,"availableCount":2,"occupancyRateBps":8000},'
            '"coverDocumentId":null}',
        cachedAt: DateTime(2026, 1, 1, 8),
      ),
    ]);

    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.pump();

    expect(find.text('Résidence Malonga'), findsOneWidget);
    expect(find.byKey(const ValueKey('offline-data-banner')), findsOneWidget);
  });
}
