import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/format/text_normalize.dart';

void main() {
  group('normalizeSearchText', () {
    test('retire les accents et met en minuscules', () {
      expect(normalizeSearchText('Ndongô'), 'ndongo');
      expect(normalizeSearchText('ÉLODIE'), 'elodie');
      expect(normalizeSearchText('Bébé Çà'), 'bebe ca');
    });

    test('réduit tirets et espaces multiples', () {
      expect(normalizeSearchText("Jean-Éric  Ndongo"), 'jean eric ndongo');
      expect(normalizeSearchText("N'Kama"), 'n kama');
    });

    test('deux graphies équivalentes se normalisent au même résultat', () {
      expect(normalizeSearchText('Ndongô'), normalizeSearchText('ndongo'));
      expect(
        normalizeSearchText('Jean-Éric'),
        normalizeSearchText('jean eric'),
      );
    });
  });
}
