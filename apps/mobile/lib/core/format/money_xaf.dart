/// Formatage des montants en Francs CFA (XAF).
///
/// Règle non négociable du référentiel commun : les montants sont des
/// entiers, jamais de décimales. Le séparateur de milliers est une espace
/// fine insécable, suivi du suffixe « FCFA ».
library;

const String _thousandsSeparator = ' ';

/// Formate un montant entier exprimé en XAF, ex. `12345` -> `12 345 FCFA`.
String formatXaf(int amountXaf) {
  final bool isNegative = amountXaf.isNegative;
  final String digits = amountXaf.abs().toString();

  final List<String> groups = <String>[];
  for (int end = digits.length; end > 0; end -= 3) {
    final int start = (end - 3).clamp(0, digits.length);
    groups.insert(0, digits.substring(start, end));
  }

  final String formatted = groups.join(_thousandsSeparator);
  return '${isNegative ? '-' : ''}$formatted FCFA';
}
