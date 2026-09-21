import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/referral/presentation/controllers/referral_partner_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

Response<dynamic> _ok(
  String path,
  Map<String, dynamic> data, {
  int status = 200,
}) {
  return Response<dynamic>(
    requestOptions: RequestOptions(path: path),
    statusCode: status,
    data: data,
  );
}

DioException _notFoundPartner(String path) => DioException(
  requestOptions: RequestOptions(path: path),
  type: DioExceptionType.badResponse,
  response: Response<dynamic>(
    requestOptions: RequestOptions(path: path),
    statusCode: 404,
    data: <String, dynamic>{
      'code': 'REFERRALS.PARTNER_NOT_FOUND',
      'message': 'Partenaire introuvable.',
    },
  ),
);

void main() {
  test(
    'build() traite REFERRALS.PARTNER_NOT_FOUND comme « pas encore inscrit »',
    () async {
      final mockDio = _MockDio();
      when(
        () => mockDio.get<dynamic>('/referral-partners/me'),
      ).thenThrow(_notFoundPartner('/referral-partners/me'));

      final container = ProviderContainer(
        overrides: [dioProvider.overrideWithValue(mockDio)],
      );
      addTearDown(container.dispose);

      final state = await container.read(
        referralPartnerControllerProvider.future,
      );
      expect(state.partner, isNull);
      expect(state.errorMessage, isNull);
    },
  );

  test(
    'register() enregistre le partenaire et met à jour le code obtenu',
    () async {
      final mockDio = _MockDio();
      when(
        () => mockDio.get<dynamic>('/referral-partners/me'),
      ).thenThrow(_notFoundPartner('/referral-partners/me'));
      when(
        () => mockDio.post<dynamic>(
          '/referral-partners',
          data: any(named: 'data'),
        ),
      ).thenAnswer(
        (_) async => _ok('/referral-partners', <String, dynamic>{
          'id': 'partner-1',
          'partnerCode': 'IMD-4K7QRT',
          'status': 'PENDING_VERIFICATION',
          'displayName': 'Jean',
          'totalAccruedAmount': '0',
          'totalPaidAmount': '0',
          'createdAt': '2026-09-21T10:00:00.000Z',
        }, status: 201),
      );

      final container = ProviderContainer(
        overrides: [dioProvider.overrideWithValue(mockDio)],
      );
      addTearDown(container.dispose);

      await container.read(referralPartnerControllerProvider.future);
      final notifier = container.read(
        referralPartnerControllerProvider.notifier,
      );
      await notifier.register(displayName: 'Jean');

      final state = container.read(referralPartnerControllerProvider).value!;
      expect(state.partner?.partnerCode, 'IMD-4K7QRT');
      expect(state.isRegistering, isFalse);
    },
  );
}
