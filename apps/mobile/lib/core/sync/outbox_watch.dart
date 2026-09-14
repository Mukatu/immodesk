import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../db/app_database.dart';
import 'outbox_repository.dart';
import 'outbox_types.dart';

/// Lecture réactive de l'outbox généralisée pour une organisation : l'écran
/// Outbox et l'indicateur permanent s'y abonnent tous les deux.
///
/// Provider écrit à la main (comme `appDatabaseProvider`,
/// `sessionExpiredStreamProvider`) plutôt que généré : le générateur
/// `riverpod_generator` 4.0.3 échoue sur ce type de retour précis
/// (`Stream<List<OutboxRow>>`, `InvalidTypeException` côté `source_gen`).
final outboxWatchProvider = StreamProvider.family<List<OutboxRow>, String>((
  ref,
  organizationId,
) {
  return ref.watch(outboxRepositoryProvider).watchAll(organizationId);
});

/// Répartition par statut, pour le badge permanent et l'écran Outbox.
class OutboxCounts {
  const OutboxCounts({
    this.pending = 0,
    this.sending = 0,
    this.sent = 0,
    this.failed = 0,
    this.conflict = 0,
  });

  final int pending;
  final int sending;
  final int sent;
  final int failed;
  final int conflict;

  /// Nombre affiché sur le badge permanent : tout ce qui reste à
  /// transmettre (`en attente` + `en cours d'envoi`).
  int get waiting => pending + sending;

  /// Nombre d'éléments nécessitant l'attention du démarcheur (échec
  /// définitif ou conflit).
  int get needsAttention => failed + conflict;

  factory OutboxCounts.fromRows(List<OutboxRow> rows) {
    int pending = 0, sending = 0, sent = 0, failed = 0, conflict = 0;
    for (final OutboxRow row in rows) {
      final OutboxStatus status = OutboxStatus.fromDbValue(row.status);
      switch (status) {
        case OutboxStatus.pending:
          pending++;
        case OutboxStatus.sending:
          sending++;
        case OutboxStatus.sent:
          sent++;
        case OutboxStatus.failed:
          failed++;
        case OutboxStatus.conflict:
          conflict++;
      }
    }
    return OutboxCounts(
      pending: pending,
      sending: sending,
      sent: sent,
      failed: failed,
      conflict: conflict,
    );
  }
}
