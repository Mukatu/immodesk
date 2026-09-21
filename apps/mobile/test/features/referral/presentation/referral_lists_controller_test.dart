import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/referral/presentation/controllers/commissions_list_controller.dart';
import 'package:immodesk_mobile/features/referral/presentation/controllers/referrals_list_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

Response<dynamic> _response(String path, Map<String, dynamic> data) {
  return Response<dynamic>(
    requestOptions: RequestOptions(path: path),
    statusCode: 200,
    data: data,
  );
}

void main() {
  test('ReferralsListController charge une page et suit son curseur', () async {
    final mockDio = _MockDio();
    when(
      () => mockDio.get<dynamic>(
        '/referral-partners/me/referrals',
        queryParameters: <String, dynamic>{'limit': 20},
      ),
    ).thenAnswer(
      (_) async =>
          _response('/referral-partners/me/referrals', <String, dynamic>{
            'items': [
              {
                'id': 'referral-1',
                'partnerId': 'partner-1',
                'referredOrganizationId': 'org-1',
                'referredPropertyId': null,
                'source': 'CODE_AT_SIGNUP',
                'status': 'ACTIVE',
                'qualifiedAt': null,
                'activatedAt': null,
                'expiresAt': null,
                'createdAt': '2026-09-21T10:00:00.000Z',
              },
            ],
            'pageInfo': {
              'nextCursor': 'referral-1',
              'hasNextPage': true,
              'limit': 20,
            },
          }),
    );

    final container = ProviderContainer(
      overrides: [dioProvider.overrideWithValue(mockDio)],
    );
    addTearDown(container.dispose);

    final state = await container.read(referralsListControllerProvider.future);
    expect(state.items, hasLength(1));
    expect(state.hasMore, isTrue);
  });

  test('CommissionsListController expose les totaux par statut', () async {
    final mockDio = _MockDio();
    when(
      () => mockDio.get<dynamic>(
        '/referral-partners/me/commissions',
        queryParameters: <String, dynamic>{'limit': 20},
      ),
    ).thenAnswer(
      (_) async =>
          _response('/referral-partners/me/commissions', <String, dynamic>{
            'items': <Map<String, dynamic>>[],
            'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 20},
            'totals': {
              'ACCRUED': '3750',
              'APPROVED': '0',
              'PAID': '0',
              'REVERSED': '0',
              'CANCELLED': '0',
            },
          }),
    );

    final container = ProviderContainer(
      overrides: [dioProvider.overrideWithValue(mockDio)],
    );
    addTearDown(container.dispose);

    final state = await container.read(
      commissionsListControllerProvider.future,
    );
    expect(state.totals.accrued, '3750');
    expect(state.hasMore, isFalse);
  });
}
