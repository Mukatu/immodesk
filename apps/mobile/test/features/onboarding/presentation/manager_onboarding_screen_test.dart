import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/auth_token_store.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/features/onboarding/presentation/screens/manager_onboarding_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

/// Stockage en mémoire : évite tout appel de canal de plateforme
/// (`flutter_secure_storage`) pendant le test.
class _FakeAuthTokenStore extends AuthTokenStore {
  _FakeAuthTokenStore() : super(const FlutterSecureStorage());

  @override
  String? get accessToken => null;

  @override
  Future<String?> readRefreshToken() async => null;
}

Response<dynamic> _ok(String path, dynamic data) => Response<dynamic>(
  requestOptions: RequestOptions(path: path),
  statusCode: 200,
  data: data,
);

const Map<String, dynamic> _meResponse = {
  'user': {
    'id': 'user-1',
    'phone': '+242055123456',
    'fullName': 'Démarcheur',
    'locale': 'fr-CG',
    'timezone': 'Africa/Brazzaville',
    'createdAt': '2026-09-01T00:00:00Z',
  },
  'organizations': [],
};

const Map<String, dynamic> _onboardingResponse = {
  'organization': {'id': 'org-1', 'legalName': 'Démarcheur Pro'},
  'landlord': {'id': 'landlord-1', 'displayName': 'Jean Makosso'},
  'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
  'mandate': {
    'id': 'mandate-1',
    'reference': 'MDT-2026-0001',
    'commissionRateBps': 1000,
  },
};

void main() {
  late _MockDio mockDio;
  late AppDatabase database;

  setUp(() {
    mockDio = _MockDio();
    database = AppDatabase.forTesting(NativeDatabase.memory());
    when(
      () => mockDio.get<dynamic>('/me'),
    ).thenAnswer((_) async => _ok('/me', _meResponse));
  });

  tearDown(() async {
    await database.close();
  });

  Widget buildApp() {
    final GoRouter router = GoRouter(
      initialLocation: RoutePaths.managerOnboarding,
      routes: [
        GoRoute(
          path: RoutePaths.managerOnboarding,
          builder: (context, state) => const ManagerOnboardingScreen(),
        ),
        GoRoute(
          path: RoutePaths.mandateDetailPattern,
          builder: (context, state) =>
              Scaffold(body: Text('mandat:${state.pathParameters['id']}')),
        ),
      ],
    );
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        authTokenStoreProvider.overrideWithValue(_FakeAuthTokenStore()),
        appDatabaseProvider.overrideWithValue(database),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  testWidgets(
    'parcours en quatre écrans brefs se termine par un seul appel réseau',
    (tester) async {
      when(
        () => mockDio.post<dynamic>(
          '/organizations/independent-manager/onboarding',
          data: any(named: 'data'),
        ),
      ).thenAnswer(
        (_) async => _ok(
          '/organizations/independent-manager/onboarding',
          _onboardingResponse,
        ),
      );

      await tester.pumpWidget(buildApp());
      await tester.pumpAndSettle();

      // Étape 1/4 : organisation.
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-org-name-field')),
        'Démarcheur Pro',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-org-city-field')),
        'Brazzaville',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-org-phone-field')),
        '+242055123456',
      );
      await tester.tap(find.byKey(const ValueKey('onboarding-next-button')));
      await tester.pumpAndSettle();

      // Étape 2/4 : bailleur.
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-landlord-firstname-field')),
        'Jean',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-landlord-lastname-field')),
        'Makosso',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-landlord-phone-field')),
        '+242066000001',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-landlord-city-field')),
        'Brazzaville',
      );
      await tester.tap(find.byKey(const ValueKey('onboarding-next-button')));
      await tester.pumpAndSettle();

      // Étape 3/4 : immeuble.
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-property-name-field')),
        'Résidence Malonga',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-property-address-field')),
        'Avenue de la Paix',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-property-district-field')),
        'Bacongo',
      );
      await tester.enterText(
        find.byKey(const ValueKey('onboarding-property-city-field')),
        'Brazzaville',
      );
      await tester.tap(find.byKey(const ValueKey('onboarding-next-button')));
      await tester.pumpAndSettle();

      // Étape 4/4 : mandat, commission par défaut pré-remplie à 10 %.
      expect(
        tester
            .widget<TextFormField>(
              find.byKey(const ValueKey('onboarding-mandate-commission-field')),
            )
            .controller
            ?.text,
        '10.0',
      );

      await tester.tap(find.byKey(const ValueKey('onboarding-submit-button')));
      await tester.pumpAndSettle();

      final captured = verify(
        () => mockDio.post<dynamic>(
          '/organizations/independent-manager/onboarding',
          data: captureAny(named: 'data'),
        ),
      ).captured;
      expect(captured, hasLength(1));
      final Map<String, dynamic> body = captured.single as Map<String, dynamic>;
      expect(body['organization']['legalName'], 'Démarcheur Pro');
      expect(body['landlord']['lastName'], 'Makosso');
      expect(body['property']['name'], 'Résidence Malonga');
      expect(body['mandate']['commissionRateBps'], 1000);
      expect(body['mandate']['commissionBasis'], 'RATE_BPS_ON_RENT_COLLECTED');

      expect(find.text('mandat:mandate-1'), findsOneWidget);
    },
  );
}
