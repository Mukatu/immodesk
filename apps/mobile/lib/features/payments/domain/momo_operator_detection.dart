import 'entities/momo_provider.dart';

/// Détection de l'opérateur Mobile Money à partir du préfixe national
/// congolais (`docs/api/phase4-contract.md`, initiation agrégateur) :
/// `06` → MTN Mobile Money, `05` → Airtel Money. Accepte un numéro déjà
/// normalisé en E.164 (`+242...`) ou une saisie nationale (`06...`).
///
/// Retourne `null` si l'opérateur ne peut pas être déduit (préfixe inconnu
/// ou numéro trop court) : l'appel `POST /initiate` renverrait alors
/// `422 MOMO.OPERATOR_UNKNOWN`.
MomoProvider? detectMomoOperator(String input) {
  final String digits = input.trim().replaceAll(RegExp(r'[\s.\-()]'), '');
  String national;
  if (digits.startsWith('+242')) {
    national = digits.substring(4);
  } else if (digits.startsWith('00242')) {
    national = digits.substring(5);
  } else if (digits.startsWith('242') && digits.length >= 12) {
    national = digits.substring(3);
  } else {
    national = digits.startsWith('0') ? digits : '0$digits';
  }
  if (national.length < 2) return null;
  final String prefix = national.substring(0, 2);
  if (prefix == '06') return MomoProvider.mtnMomo;
  if (prefix == '05') return MomoProvider.airtelMoney;
  return null;
}
