import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/format/money_xaf.dart';

/// Espace fine insécable (U+202F), séparateur de milliers imposé par le
/// référentiel commun (`docs/02_architecture_technique.md` §11.5).
const String _sep = ' ';

void main() {
  group('formatXaf', () {
    test('formate un montant sans séparateur pour moins de 1000', () {
      expect(formatXaf(0), '0 FCFA');
      expect(formatXaf(5), '5 FCFA');
      expect(formatXaf(999), '999 FCFA');
    });

    test('insère un séparateur de milliers (espace insécable)', () {
      expect(formatXaf(1000), '1${_sep}000 FCFA');
      expect(formatXaf(12345), '12${_sep}345 FCFA');
      expect(formatXaf(123456), '123${_sep}456 FCFA');
    });

    test('gère plusieurs groupes de milliers', () {
      expect(formatXaf(1234567), '1${_sep}234${_sep}567 FCFA');
      expect(formatXaf(1000000000), '1${_sep}000${_sep}000${_sep}000 FCFA');
    });

    test('ne produit jamais de décimales', () {
      expect(formatXaf(150000), isNot(contains('.')));
      expect(formatXaf(150000), isNot(contains(',')));
    });

    test('gère les montants négatifs (avoirs, contre-passations)', () {
      expect(formatXaf(-1500), '-1${_sep}500 FCFA');
      expect(formatXaf(-1000000), '-1${_sep}000${_sep}000 FCFA');
    });
  });
}
