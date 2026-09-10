import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/format/phone_number.dart';

void main() {
  group('normalizeCongoPhone', () {
    test('accepte un numéro déjà au format E.164', () {
      expect(normalizeCongoPhone('+242066000001'), '+242066000001');
    });

    test('normalise un numéro local commençant par 0', () {
      expect(normalizeCongoPhone('066000001'), '+242066000001');
    });

    test('normalise un numéro avec indicatif 242 sans le +', () {
      expect(normalizeCongoPhone('242066000001'), '+242066000001');
    });

    test('normalise un numéro avec préfixe international 00', () {
      expect(normalizeCongoPhone('00242066000001'), '+242066000001');
    });

    test('normalise un numéro à 9 chiffres sans indicatif', () {
      expect(normalizeCongoPhone('066000001'), '+242066000001');
    });

    test('ignore les espaces, points et tirets', () {
      expect(normalizeCongoPhone('+242 06 600 00 01'), '+242066000001');
      expect(normalizeCongoPhone('+242-06-600-00-01'), '+242066000001');
      expect(normalizeCongoPhone('+242.06.600.00.01'), '+242066000001');
    });

    test('rejette un numéro trop court', () {
      expect(normalizeCongoPhone('+24206600'), isNull);
    });

    test('rejette un numéro trop long', () {
      expect(normalizeCongoPhone('+2420660000011'), isNull);
    });

    test('rejette une saisie vide', () {
      expect(normalizeCongoPhone(''), isNull);
      expect(normalizeCongoPhone('   '), isNull);
    });

    test('rejette un indicatif étranger', () {
      expect(normalizeCongoPhone('+33612345678'), isNull);
    });
  });

  group('isValidCongoPhone', () {
    test('true pour un numéro valide', () {
      expect(isValidCongoPhone('+242066000001'), isTrue);
    });

    test('false pour un numéro invalide', () {
      expect(isValidCongoPhone('abc'), isFalse);
    });
  });

  group('formatCongoPhoneDisplay', () {
    test('groupe les chiffres pour l\'affichage', () {
      expect(formatCongoPhoneDisplay('+242066000001'), '+242 06 600 00 01');
    });

    test('retourne la valeur telle quelle si non normalisée', () {
      expect(formatCongoPhoneDisplay('invalide'), 'invalide');
    });
  });
}
