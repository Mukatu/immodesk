import '../db/app_database.dart';
import 'outbox_repository.dart';

/// Ordonne des lignes d'`outbox` pour un lot de synchronisation : triées
/// par dépendances (`dependsOn`) puis par `clientCreatedAt` croissant,
/// comme l'exige `docs/api/phase5-contract.md` (« Les opérations sont
/// triées par dependsOn puis par clientCreatedAt »).
///
/// Une dépendance qui ne fait pas partie du lot (déjà envoyée, ou absente)
/// est considérée satisfaite : elle ne bloque pas l'ordre. Un cycle de
/// dépendances (anomalie locale) ne doit jamais faire planter le moteur :
/// on se replie alors sur l'ordre chronologique brut pour les éléments
/// restants.
List<OutboxRow> orderForBatch(
  List<OutboxRow> candidates,
  OutboxRepository repository,
) {
  final Map<String, OutboxRow> byRef = {
    for (final OutboxRow row in candidates) row.clientRef: row,
  };
  final List<OutboxRow> ordered = [];
  final Set<String> placed = {};
  final List<OutboxRow> remaining = [...candidates]
    ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

  bool progressed = true;
  while (remaining.isNotEmpty && progressed) {
    progressed = false;
    for (final OutboxRow row in [...remaining]) {
      final List<String> deps = repository.dependsOnOf(row);
      final bool ready = deps.every(
        (ref) => !byRef.containsKey(ref) || placed.contains(ref),
      );
      if (ready) {
        ordered.add(row);
        placed.add(row.clientRef);
        remaining.remove(row);
        progressed = true;
      }
    }
  }
  // Cycle défensif (ne devrait jamais arriver) : on ajoute le reste tel quel
  // plutôt que de bloquer indéfiniment le lot.
  ordered.addAll(remaining);
  return ordered;
}
