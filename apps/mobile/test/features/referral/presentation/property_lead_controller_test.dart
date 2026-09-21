import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/referral/presentation/controllers/property_lead_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

void main() {
  test('canSubmit exige un numéro plausible avant tout envoi', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    expect(container.read(propertyLeadControllerProvider).canSubmit, isFalse);
    container
        .read(propertyLeadControllerProvider.notifier)
        .setLandlordPhone('+242066000002');
    expect(container.read(propertyLeadControllerProvider).canSubmit, isTrue);
  });

  test(
    'submit() poste le numéro et le canal puis stocke le résultat',
    () async {
      final mockDio = _MockDio();
      Map<String, dynamic>? capturedBody;
      when(
        () => mockDio.post<dynamic>(
          '/referral-partners/me/properties',
          data: any(named: 'data'),
        ),
      ).thenAnswer((invocation) async {
        capturedBody = invocation.namedArguments[#data] as Map<String, dynamic>;
        return Response<dynamic>(
          requestOptions: RequestOptions(
            path: '/referral-partners/me/properties',
          ),
          statusCode: 202,
          data: <String, dynamic>{
            'id': 'lead-1',
            'confirmationSentTo': '+242066••••02',
          },
        );
      });

      final container = ProviderContainer(
        overrides: [dioProvider.overrideWithValue(mockDio)],
      );
      addTearDown(container.dispose);

      final notifier = container.read(propertyLeadControllerProvider.notifier);
      notifier.setLandlordPhone('+242066000002');
      notifier.setNote('Immeuble Bacongo');
      notifier.setChannel('SMS');
      await notifier.submit();

      expect(capturedBody, isNotNull);
      expect(capturedBody!['landlordPhone'], '+242066000002');
      expect(capturedBody!['channel'], 'SMS');
      final state = container.read(propertyLeadControllerProvider);
      expect(state.result?.confirmationSentTo, '+242066••••02');
      expect(state.isSubmitting, isFalse);
    },
  );
}
