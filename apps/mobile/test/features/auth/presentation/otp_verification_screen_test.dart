import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/network/auth_token_store.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/features/auth/presentation/controllers/auth_session_controller.dart';
import 'package:immodesk_mobile/features/auth/presentation/screens/otp_verification_screen.dart';
import 'package:immodesk_mobile/features/auth/presentation/screens/phone_entry_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeAuthSessionController extends AuthSessionController {
  @override
  Future<AuthSessionState> build() async => const AuthSessionState();
}

/// Stockage en mémoire : évite tout appel de canal de plateforme
/// (`flutter_secure_storage`) dans les tests de widget.
class _FakeAuthTokenStore extends AuthTokenStore {
  _FakeAuthTokenStore() : super(const FlutterSecureStorage());

  String? _refreshToken;

  @override
  String? get accessToken => _fakeAccessToken;
  String? _fakeAccessToken;

  @override
  void setAccessToken(String? token) => _fakeAccessToken = token;

  @override
  Future<String?> readRefreshToken() async => _refreshToken;

  @override
  Future<void> saveRefreshToken(String token) async {
    _refreshToken = token;
  }

  @override
  Future<void> clear() async {
    _fakeAccessToken = null;
    _refreshToken = null;
  }
}

const Map<String, dynamic> _verifyOkBody = <String, dynamic>{
  'accessToken': 'access-token',
  'refreshToken': 'refresh-token',
  'user': <String, dynamic>{
    'id': 'user-1',
    'phone': '+242066000001',
    'fullName': 'Jean Malonga',
    'email': null,
    'locale': 'fr-CG',
    'timezone': 'Africa/Brazzaville',
    'createdAt': '2026-01-01T00:00:00.000Z',
  },
  'organizations': <dynamic>[
    <String, dynamic>{
      'organization': <String, dynamic>{
        'id': 'org-1',
        'type': 'AGENCY',
        'legalName': 'Agence Mpila Immo',
        'tradeName': null,
        'slug': 'agence-mpila-immo',
        'city': 'Brazzaville',
        'district': null,
        'contactPhone': '+242066000001',
        'contactEmail': null,
        'logoUrl': null,
        'status': 'ACTIVE',
        'createdAt': '2026-01-01T00:00:00.000Z',
      },
      'role': 'OWNER',
      'joinedAt': '2026-01-01T00:00:00.000Z',
    },
  ],
};

void main() {
  late _MockDio mockDio;

  setUp(() {
    mockDio = _MockDio();
    when(
      () => mockDio.post<dynamic>(
        '/auth/otp/request',
        data: any(named: 'data'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/auth/otp/request'),
        statusCode: 201,
        data: <String, dynamic>{
          'requestId': 'req-1',
          'channel': 'SMS',
          'expiresInSeconds': 300,
          'resendAfterSeconds': 60,
        },
      ),
    );
  });

  Widget buildApp() {
    final router = GoRouter(
      initialLocation: RoutePaths.loginPhone,
      routes: [
        GoRoute(
          path: RoutePaths.loginPhone,
          builder: (context, state) => const PhoneEntryScreen(),
        ),
        GoRoute(
          path: RoutePaths.loginOtp,
          builder: (context, state) => const OtpVerificationScreen(),
        ),
        GoRoute(
          path: RoutePaths.organizationSelect,
          builder: (context, state) =>
              const Scaffold(body: Center(child: Text('ORG_SELECT'))),
        ),
      ],
    );

    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        authTokenStoreProvider.overrideWithValue(_FakeAuthTokenStore()),
        authSessionControllerProvider.overrideWith(
          _FakeAuthSessionController.new,
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  /// Amène l'application sur l'écran OTP en simulant la demande de code.
  Future<void> goToOtpScreen(WidgetTester tester) async {
    await tester.pumpWidget(buildApp());
    await tester.pump();
    await tester.enterText(
      find.byKey(const ValueKey('phone-field')),
      '+242066000001',
    );
    await tester.tap(find.byKey(const ValueKey('send-code-button')));
    await tester.pump();
    await tester.pump();
    await tester.pump();
    expect(find.byType(OtpVerificationScreen), findsOneWidget);
  }

  testWidgets('un code valide connecte et navigue vers les organisations', (
    tester,
  ) async {
    await goToOtpScreen(tester);

    when(
      () => mockDio.post<dynamic>(
        '/auth/otp/verify',
        data: any(named: 'data'),
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: '/auth/otp/verify'),
        statusCode: 200,
        data: _verifyOkBody,
      ),
    );

    await tester.enterText(
      find.byKey(const ValueKey('otp-digit-0')),
      '123456',
    );
    await tester.pump();
    await tester.pump();
    await tester.pump();

    verify(
      () => mockDio.post<dynamic>(
        '/auth/otp/verify',
        data: <String, dynamic>{
          'phone': '+242066000001',
          'code': '123456',
          'deviceName': 'Flutter mobile',
        },
      ),
    ).called(1);

    expect(find.text('ORG_SELECT'), findsOneWidget);
  });

  testWidgets('IAM.OTP_INVALID affiche « Code incorrect. »', (tester) async {
    await goToOtpScreen(tester);

    when(
      () => mockDio.post<dynamic>(
        '/auth/otp/verify',
        data: any(named: 'data'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/auth/otp/verify'),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: RequestOptions(path: '/auth/otp/verify'),
          statusCode: 401,
          data: <String, dynamic>{
            'code': 'IAM.OTP_INVALID',
            'message': 'Code incorrect.',
          },
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const ValueKey('otp-digit-0')),
      '000000',
    );
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(find.text('Code incorrect.'), findsOneWidget);
    expect(find.text('ORG_SELECT'), findsNothing);
  });

  testWidgets(
    'IAM.OTP_LOCKED affiche le message de blocage après 5 échecs',
    (tester) async {
      await goToOtpScreen(tester);

      when(
        () => mockDio.post<dynamic>(
          '/auth/otp/verify',
          data: any(named: 'data'),
        ),
      ).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: '/auth/otp/verify'),
          type: DioExceptionType.badResponse,
          response: Response<dynamic>(
            requestOptions: RequestOptions(path: '/auth/otp/verify'),
            statusCode: 429,
            data: <String, dynamic>{
              'code': 'IAM.OTP_LOCKED',
              'message': 'Trop de tentatives. Demandez un nouveau code.',
            },
          ),
        ),
      );

      await tester.enterText(
        find.byKey(const ValueKey('otp-digit-0')),
        '000000',
      );
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(
        find.text('Trop de tentatives. Demandez un nouveau code.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('IAM.RATE_LIMITED affiche le message de limitation de débit', (
    tester,
  ) async {
    await goToOtpScreen(tester);

    when(
      () => mockDio.post<dynamic>(
        '/auth/otp/verify',
        data: any(named: 'data'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/auth/otp/verify'),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: RequestOptions(path: '/auth/otp/verify'),
          statusCode: 429,
          data: <String, dynamic>{
            'code': 'IAM.RATE_LIMITED',
            'message': 'Trop de demandes. Réessayez dans quelques minutes.',
          },
        ),
      ),
    );

    await tester.enterText(
      find.byKey(const ValueKey('otp-digit-0')),
      '000000',
    );
    await tester.pump();
    await tester.pump();
    await tester.pump();

    expect(
      find.text('Trop de demandes. Réessayez dans quelques minutes.'),
      findsOneWidget,
    );
  });
}
