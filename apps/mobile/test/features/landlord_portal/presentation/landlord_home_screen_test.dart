import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/format/money_xaf.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/landlord_portal/presentation/screens/landlord_home_screen.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

Response<dynamic> _ok(String path, dynamic data) => Response<dynamic>(
  requestOptions: RequestOptions(path: path),
  statusCode: 200,
  data: data,
);

const Map<String, dynamic> _meResponse = {
  'landlord': {
    'id': 'landlord-2',
    'displayName': 'Alice Ndongo',
    'primaryPhone': '+33601020304',
    'city': 'Paris',
    'countryCode': 'FR',
    'payoutMethod': 'BANK_TRANSFER',
  },
  'organizations': [
    {'id': 'org-1', 'name': 'Agence Malonga'},
  ],
};

const Map<String, dynamic> _statementsResponse = {
  'items': [
    {
      'id': 'stmt-1',
      'statementNumber': 'REL-202608-0001',
      'status': 'ISSUED',
      'periodStart': '2026-08-01',
      'periodEnd': '2026-08-31',
      'netPayableAmount': 390000,
    },
  ],
};

const Map<String, dynamic> _payoutsResponse = {
  'items': [
    {
      'id': 'payout-1',
      'reference': 'REV-202607-0001',
      'status': 'PAID',
      'method': 'BANK_TRANSFER',
      'amount': 300000,
      'netAmount': 298000,
      'paidAt': '2026-07-15T09:00:00Z',
    },
  ],
};

void main() {
  late _MockDio mockDio;

  setUp(() {
    mockDio = _MockDio();
    when(
      () => mockDio.get<dynamic>('/portal/me'),
    ).thenAnswer((_) async => _ok('/portal/me', _meResponse));
    when(
      () => mockDio.get<dynamic>(
        '/portal/statements',
        queryParameters: any(named: 'queryParameters'),
      ),
    ).thenAnswer((_) async => _ok('/portal/statements', _statementsResponse));
    when(
      () => mockDio.get<dynamic>(
        '/portal/payouts',
        queryParameters: any(named: 'queryParameters'),
      ),
    ).thenAnswer((_) async => _ok('/portal/payouts', _payoutsResponse));
  });

  Widget buildApp() {
    return ProviderScope(
      overrides: [dioProvider.overrideWithValue(mockDio)],
      child: const MaterialApp(home: LandlordHomeScreen()),
    );
  }

  testWidgets('affiche le solde à percevoir, le dernier relevé, le dernier '
      'reversement et le bandeau diaspora, sans aucune action d\'écriture', (
    tester,
  ) async {
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    expect(find.text('Alice Ndongo'), findsOneWidget);
    expect(find.byKey(const ValueKey('landlord-balance-card')), findsOneWidget);
    expect(find.text(formatXaf(390000)), findsWidgets);
    expect(
      find.byKey(const ValueKey('landlord-last-statement-card')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('landlord-last-payout-card')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('landlord-diaspora-banner')),
      findsOneWidget,
    );
    expect(find.textContaining('hors du Congo'), findsOneWidget);
    expect(find.textContaining('Virement bancaire'), findsOneWidget);

    // Aucune action d'écriture n'est jamais proposée dans l'espace
    // bailleur : ni bouton d'action, ni appel réseau autre que GET.
    expect(find.byType(FilledButton), findsNothing);
    expect(find.byType(ElevatedButton), findsNothing);
    verifyNever(() => mockDio.post<dynamic>(any(), data: any(named: 'data')));
    verifyNever(() => mockDio.patch<dynamic>(any(), data: any(named: 'data')));
    verifyNever(() => mockDio.delete<dynamic>(any()));
  });

  testWidgets('un bailleur au Congo ne voit pas le bandeau diaspora', (
    tester,
  ) async {
    when(() => mockDio.get<dynamic>('/portal/me')).thenAnswer(
      (_) async => _ok('/portal/me', {
        ..._meResponse,
        'landlord': {..._meResponse['landlord']! as Map, 'countryCode': 'CG'},
      }),
    );
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('landlord-diaspora-banner')),
      findsNothing,
    );
  });
}
