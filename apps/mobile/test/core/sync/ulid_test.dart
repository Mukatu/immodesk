import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/sync/ulid.dart';

void main() {
  test('génère des identifiants uniques en série', () {
    final Set<String> generated = {
      for (int i = 0; i < 2000; i++) Ulid.generate(),
    };
    expect(generated.length, 2000);
  });

  test('produit 26 caractères en alphabet Crockford base32', () {
    final String id = Ulid.generate();
    expect(id.length, 26);
    expect(RegExp(r'^[0-9A-HJKMNP-TV-Z]{26}$').hasMatch(id), isTrue);
  });

  test('les 10 premiers caractères sont triables chronologiquement', () async {
    final String first = Ulid.generate();
    await Future<void>.delayed(const Duration(milliseconds: 5));
    final String second = Ulid.generate();
    expect(
      first.substring(0, 10).compareTo(second.substring(0, 10)) <= 0,
      isTrue,
    );
  });
}
