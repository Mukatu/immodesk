import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/mandates/presentation/screens/mandate_detail_screen.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

Response<dynamic> _ok(String path, dynamic data) => Response<dynamic>(
  requestOptions: RequestOptions(path: path),
  statusCode: 200,
  data: data,
);

Map<String, dynamic> _mandateJson({
  bool invited = false,
  bool activated = false,
}) => {
  'id': 'mandate-1',
  'reference': 'MDT-2026-0001',
  'status': 'ACTIVE',
  'landlord': {
    'id': 'landlord-1',
    'displayName': 'Jean Makosso',
    'isDiaspora': false,
  },
  'commissionBasis': 'RATE_BPS_ON_RENT_COLLECTED',
  'commissionRateBps': 1000,
  'vatRateBps': 1800,
  'startDate': '2026-09-01',
  'payoutDay': 10,
  'currency': 'XAF',
  'landlordPortal': {
    'invited': invited,
    'invitedAt': invited ? '2026-09-14T10:00:00Z' : null,
    'activated': activated,
    'userId': activated ? 'user-1' : null,
  },
};

void main() {
  late _MockDio mockDio;

  setUp(() {
    mockDio = _MockDio();
  });

  Widget buildApp() {
    return ProviderScope(
      overrides: [
        dioProvider.overrideWithValue(mockDio),
        selectedOrganizationControllerProvider.overrideWith(
          _FakeSelectedOrganizationController.new,
        ),
      ],
      child: const MaterialApp(
        home: MandateDetailScreen(mandateId: 'mandate-1'),
      ),
    );
  }

  testWidgets(
    'affiche le mandat et permet d\'inviter le bailleur par WhatsApp',
    (tester) async {
      when(
        () => mockDio.get<dynamic>(
          '/management-mandates/mandate-1',
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => _ok('/management-mandates/mandate-1', _mandateJson()),
      );
      when(
        () => mockDio.post<dynamic>(
          '/management-mandates/mandate-1/landlord-invitation',
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => _ok('/landlord-invitation', {
          'notificationId': 'notif-1',
          'invitationStatus': 'SENT',
        }),
      );

      await tester.pumpWidget(buildApp());
      await tester.pumpAndSettle();

      expect(find.text('MDT-2026-0001'), findsOneWidget);
      expect(find.text('Bailleur : Jean Makosso'), findsOneWidget);
      expect(find.text('Non invité'), findsOneWidget);

      when(
        () => mockDio.get<dynamic>(
          '/management-mandates/mandate-1',
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async =>
            _ok('/management-mandates/mandate-1', _mandateJson(invited: true)),
      );

      await tester.tap(find.byKey(const ValueKey('invite-landlord-button')));
      await tester.pumpAndSettle();

      verify(
        () => mockDio.post<dynamic>(
          '/management-mandates/mandate-1/landlord-invitation',
          options: any(named: 'options'),
        ),
      ).called(1);
      expect(find.text('Envoyée'), findsOneWidget);
    },
  );

  testWidgets('une invitation déjà activée n\'affiche plus le bouton actif', (
    tester,
  ) async {
    when(
      () => mockDio.get<dynamic>(
        '/management-mandates/mandate-1',
        options: any(named: 'options'),
      ),
    ).thenAnswer(
      (_) async => _ok(
        '/management-mandates/mandate-1',
        _mandateJson(invited: true, activated: true),
      ),
    );

    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    expect(find.text('Activée'), findsOneWidget);
    final FilledButton button = tester.widget(
      find.byKey(const ValueKey('invite-landlord-button')),
    );
    expect(button.onPressed, isNull);
  });
}
