import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/auth/domain/otp_state_machine.dart';
import 'package:immodesk_mobile/features/referral/presentation/controllers/property_lead_confirmation_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

const String _path = '/referral-partners/me/properties/lead-1/confirm-otp';

void main() {
  test('build() démarre directement au stade « code reçu »', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final state = container.read(
      propertyLeadConfirmationControllerProvider('lead-1'),
    );
    expect(state.phase, OtpPhase.codeSent);
    expect(state.canSubmit, isFalse);
  });

  test('submit() avec un code valide confirme le parrainage', () async {
    final mockDio = _MockDio();
    when(
      () => mockDio.post<dynamic>(
        _path,
        data: <String, dynamic>{'code': '123456'},
      ),
    ).thenAnswer(
      (_) async => Response<dynamic>(
        requestOptions: RequestOptions(path: _path),
        statusCode: 201,
        data: <String, dynamic>{
          'id': 'referral-1',
          'partnerId': 'partner-1',
          'referredOrganizationId': 'org-1',
          'referredPropertyId': null,
          'source': 'PARTNER_REGISTERED_PROPERTY',
          'status': 'PENDING',
          'qualifiedAt': null,
          'activatedAt': null,
          'expiresAt': null,
          'createdAt': '2026-09-21T10:00:00.000Z',
        },
      ),
    );

    final container = ProviderContainer(
      overrides: [dioProvider.overrideWithValue(mockDio)],
    );
    addTearDown(container.dispose);

    final notifier = container.read(
      propertyLeadConfirmationControllerProvider('lead-1').notifier,
    );
    notifier.setCode('123456');
    await notifier.submit();

    final state = container.read(
      propertyLeadConfirmationControllerProvider('lead-1'),
    );
    expect(state.phase, OtpPhase.verified);
    expect(state.referral?.id, 'referral-1');
  });

  test('submit() avec un code invalide repasse en invalidCode', () async {
    final mockDio = _MockDio();
    when(
      () => mockDio.post<dynamic>(
        _path,
        data: <String, dynamic>{'code': '000000'},
      ),
    ).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: _path),
        type: DioExceptionType.badResponse,
        response: Response<dynamic>(
          requestOptions: RequestOptions(path: _path),
          statusCode: 422,
          data: <String, dynamic>{
            'code': 'IAM.OTP_INVALID',
            'message': 'Code incorrect.',
          },
        ),
      ),
    );

    final container = ProviderContainer(
      overrides: [dioProvider.overrideWithValue(mockDio)],
    );
    addTearDown(container.dispose);

    final notifier = container.read(
      propertyLeadConfirmationControllerProvider('lead-1').notifier,
    );
    notifier.setCode('000000');
    await notifier.submit();

    final state = container.read(
      propertyLeadConfirmationControllerProvider('lead-1'),
    );
    expect(state.phase, OtpPhase.invalidCode);
    expect(state.errorMessage, isNotNull);
    expect(state.canSubmit, isTrue);
  });
}
