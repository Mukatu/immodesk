/// Normalisation de texte pour la recherche locale (insensible à la casse
/// et aux accents), ex. « Ndongô » et « ndongo » doivent correspondre.
library;

const Map<String, String> _accentMap = <String, String>{
  'à': 'a',
  'â': 'a',
  'ä': 'a',
  'á': 'a',
  'ã': 'a',
  'å': 'a',
  'ç': 'c',
  'è': 'e',
  'é': 'e',
  'ê': 'e',
  'ë': 'e',
  'ì': 'i',
  'í': 'i',
  'î': 'i',
  'ï': 'i',
  'ñ': 'n',
  'ò': 'o',
  'ó': 'o',
  'ô': 'o',
  'ö': 'o',
  'õ': 'o',
  'ù': 'u',
  'ú': 'u',
  'û': 'u',
  'ü': 'u',
  'ý': 'y',
  'ÿ': 'y',
};

/// Retire les accents, met en minuscules et réduit les séparateurs (tirets,
/// apostrophes, espaces multiples) à une espace unique, pour une
/// comparaison de recherche stable côté client.
String normalizeSearchText(String input) {
  final StringBuffer buffer = StringBuffer();
  for (final int codeUnit in input.toLowerCase().codeUnits) {
    final String char = String.fromCharCode(codeUnit);
    buffer.write(_accentMap[char] ?? char);
  }
  final String withoutAccents = buffer.toString();
  return withoutAccents
      .replaceAll(RegExp(r"[-'_]"), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}
