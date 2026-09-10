import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/core/router/route_paths.dart';
import 'package:immodesk_mobile/features/auth/presentation/controllers/auth_session_controller.dart';
import 'package:immodesk_mobile/features/auth/presentation/screens/otp_verification_screen.dart';
import 'package:immodesk_mobile/features/auth/presentation/screens/phone_entry_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

/// Session déjà résolue (aucun appel à `flutter_secure_storage`), afin de
/// garder ces tests de widget concentrés sur le parcours OTP.
class _FakeAuthSessionController extends AuthSessionController {
  @override
  Future<AuthSessionState> build() async => const AuthSessionState();
}

void main() {
  late _MockDio mockDio;

  setUp(() {
    mockDio = _MockDio();
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
        authSessionControllerProvider.overrideWith(
          _FakeAuthSessionController.new,
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }

  testWidgets(
    'demande un code OTP puis navigue vers l\'écran de vérification',
    (tester) async {
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

      verify(
        () => mockDio.post<dynamic>(
          '/auth/otp/request',
          data: <String, dynamic>{
            'phone': '+242066000001',
            'channel': 'SMS',
          },
        ),
      ).called(1);

      expect(find.byType(OtpVerificationScreen), findsOneWidget);
      expect(
        find.text('Entrez le code reçu au +242066000001'),
        findsOneWidget,
      );
    },
  );

  testWidgets('affiche un numéro invalide sans appeler l\'API', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());
    await tester.pump();

    await tester.enterText(
      find.byKey(const ValueKey('phone-field')),
      '123',
    );
    await tester.tap(find.byKey(const ValueKey('send-code-button')));
    await tester.pump();

    expect(
      find.text('Numéro invalide. Utilisez le format +242 06 XXX XX XX.'),
      findsOneWidget,
    );
    verifyNever(
      () => mockDio.post<dynamic>(
        '/auth/otp/request',
        data: any(named: 'data'),
      ),
    );
  });

  testWidgets('affiche le message IAM.RATE_LIMITED renvoyé par l\'API', (
    tester,
  ) async {
    when(
      () => mockDio.post<dynamic>(
        '/auth/otp/request',
        data: any(named: 'data'),
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/auth/otp/request'),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: RequestOptions(path: '/auth/otp/request'),
          statusCode: 429,
          data: <String, dynamic>{
            'code': 'IAM.RATE_LIMITED',
            'message': 'Trop de demandes. Réessayez dans quelques minutes.',
          },
        ),
      ),
    );

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

    expect(
      find.text('Trop de demandes. Réessayez dans quelques minutes.'),
      findsOneWidget,
    );
    expect(find.byType(OtpVerificationScreen), findsNothing);
  });
}
