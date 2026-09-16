import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/meters/domain/meter_reading_math.dart';

void main() {
  group('meterCapacity', () {
    test('déduit la capacité du nombre de chiffres', () {
      expect(meterCapacity(5), 100000);
      expect(meterCapacity(4), 10000);
      expect(meterCapacity(1), 10);
    });
  });

  group('isIndexRegression', () {
    test('détecte un index inférieur au précédent', () {
      expect(
        isIndexRegression(previousIndex: 1240, currentIndex: 1180),
        isTrue,
      );
    });

    test('une progression normale n\'est pas une régression', () {
      expect(
        isIndexRegression(previousIndex: 1240, currentIndex: 1300),
        isFalse,
      );
    });

    test('un index identique n\'est pas une régression', () {
      expect(
        isIndexRegression(previousIndex: 1240, currentIndex: 1240),
        isFalse,
      );
    });
  });

  group('computeConsumption', () {
    test('consommation simple sans passage par zéro', () {
      final int consumption = computeConsumption(
        previousIndex: 1200,
        currentIndex: 1212,
        digitsCount: 5,
      );
      expect(consumption, 12);
    });

    test('passage par zéro confirmé traverse la capacité du compteur', () {
      // Compteur à 5 chiffres (capacité 100000), dernier index 99990,
      // nouveau relevé à 15 après le passage par zéro : 10 + 15 = 25.
      final int consumption = computeConsumption(
        previousIndex: 99990,
        currentIndex: 15,
        digitsCount: 5,
        rolloverApplied: true,
      );
      expect(consumption, 25);
    });
  });
}
