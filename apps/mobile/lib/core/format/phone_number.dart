/// Normalisation et formatage des numéros de téléphone congolais (+242).
library;

final RegExp _e164Congo = RegExp(r'^\+242[0-9]{9}$');

/// Normalise une saisie utilisateur tolérante vers le format E.164 `+242…`.
///
/// Retourne `null` si la saisie ne peut pas être normalisée en un numéro
/// congolais valide (9 chiffres après l'indicatif +242).
String? normalizeCongoPhone(String input) {
  final String cleaned = input.trim().replaceAll(RegExp(r'[\s.\-()]'), '');
  if (cleaned.isEmpty) return null;

  String candidate;
  if (cleaned.startsWith('+242')) {
    candidate = cleaned;
  } else if (cleaned.startsWith('00242')) {
    candidate = '+${cleaned.substring(2)}';
  } else if (cleaned.startsWith('242') && cleaned.length == 12) {
    candidate = '+$cleaned';
  } else if (cleaned.startsWith('0') && cleaned.length == 10) {
    candidate = '+242${cleaned.substring(1)}';
  } else if (cleaned.startsWith('+')) {
    candidate = cleaned;
  } else if (cleaned.length == 9) {
    candidate = '+242$cleaned';
  } else {
    candidate = cleaned;
  }

  return _e164Congo.hasMatch(candidate) ? candidate : null;
}

/// `true` si [input] peut être normalisé en numéro congolais valide.
bool isValidCongoPhone(String input) => normalizeCongoPhone(input) != null;

/// Formate un numéro déjà normalisé (`+242066000001`) pour l'affichage :
/// `+242 06 600 00 01`.
String formatCongoPhoneDisplay(String e164) {
  if (!_e164Congo.hasMatch(e164)) return e164;
  final String national = e164.substring(4);
  return '+242 '
      '${national.substring(0, 2)} '
      '${national.substring(2, 5)} '
      '${national.substring(5, 7)} '
      '${national.substring(7, 9)}';
}
