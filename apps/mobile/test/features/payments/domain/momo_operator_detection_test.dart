import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/payments/domain/entities/momo_provider.dart';
import 'package:immodesk_mobile/features/payments/domain/momo_operator_detection.dart';

void main() {
  group('detectMomoOperator', () {
    test('06 en préfixe national détecte MTN Mobile Money', () {
      expect(detectMomoOperator('066123456'), MomoProvider.mtnMomo);
      expect(detectMomoOperator('06 61 23 456'), MomoProvider.mtnMomo);
    });

    test('05 en préfixe national détecte Airtel Money', () {
      expect(detectMomoOperator('055123456'), MomoProvider.airtelMoney);
    });

    test('numéro déjà normalisé en E.164 (+242) est reconnu', () {
      expect(detectMomoOperator('+242066123456'), MomoProvider.mtnMomo);
      expect(detectMomoOperator('+242055123456'), MomoProvider.airtelMoney);
    });

    test('préfixe international 00242 est reconnu', () {
      expect(detectMomoOperator('00242066123456'), MomoProvider.mtnMomo);
    });

    test('préfixe inconnu renvoie null (422 côté API)', () {
      expect(detectMomoOperator('01123456'), isNull);
      expect(detectMomoOperator('04123456'), isNull);
    });

    test('numéro trop court renvoie null', () {
      expect(detectMomoOperator('0'), isNull);
      expect(detectMomoOperator(''), isNull);
    });
  });
}
