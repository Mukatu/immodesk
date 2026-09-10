import 'dart:math';

/// Génère un identifiant de type ULID (26 caractères, Crockford base32,
/// triable par ordre chronologique) utilisé comme `client_ref`
/// d'idempotence pour l'outbox (voir `docs/_DECISIONS_COMMUNES.md`).
///
/// Implémentation minimale locale (pas de dépendance externe) : 48 bits
/// d'horodatage en millisecondes + 80 bits d'aléa, encodés en base32
/// Crockford.
class Ulid {
  const Ulid._();

  static const String _crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static final Random _random = Random.secure();

  static String generate() {
    final int timestamp = DateTime.now().toUtc().millisecondsSinceEpoch;
    final String time = _encodeTime(timestamp, 10);
    final String randomness = _encodeRandom(16);
    return time + randomness;
  }

  static String _encodeTime(int timestamp, int length) {
    final List<String> chars = List<String>.filled(length, '0');
    int value = timestamp;
    for (int i = length - 1; i >= 0; i--) {
      chars[i] = _crockford[value % 32];
      value ~/= 32;
    }
    return chars.join();
  }

  static String _encodeRandom(int length) {
    final StringBuffer buffer = StringBuffer();
    for (int i = 0; i < length; i++) {
      buffer.write(_crockford[_random.nextInt(32)]);
    }
    return buffer.toString();
  }
}
