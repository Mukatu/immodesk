import 'package:intl/intl.dart';

/// Formate une date ISO du contrat (`executedAt`/`scheduledAt`) en
/// `jj/mm/aaaa à hh:mm`, ou renvoie la chaîne brute si elle n'est pas
/// analysable — jamais d'exception d'affichage sur une donnée serveur.
String formatDunningDate(String iso) {
  final DateTime? parsed = DateTime.tryParse(iso);
  if (parsed == null) return iso;
  return DateFormat('dd/MM/yyyy à HH:mm').format(parsed);
}
