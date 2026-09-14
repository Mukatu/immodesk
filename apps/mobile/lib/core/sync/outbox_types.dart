/// Types d'opération de l'enveloppe de synchronisation
/// (`docs/api/phase5-contract.md`) : « le protocole est générique, les
/// types d'opérations sont ceux qui existent ». Ajouter un type en phase 8
/// ne doit modifier ni la route, ni le format, ni le moteur de rejeu — voir
/// `SyncEngine`.
enum OutboxOperationType {
  cashReceipt('CASH_RECEIPT'),
  document('DOCUMENT');

  const OutboxOperationType(this.apiValue);

  final String apiValue;

  static OutboxOperationType fromApiValue(String value) {
    return OutboxOperationType.values.firstWhere(
      (t) => t.apiValue == value,
      orElse: () => throw ArgumentError('Type d\'opération inconnu : $value'),
    );
  }
}

/// État d'une ligne d'`outbox` généralisée (`docs/api/phase5-contract.md`
/// « Côté mobile »). La file n'est jamais purgée automatiquement : un
/// élément `sent` reste visible dans l'historique de l'écran Outbox.
enum OutboxStatus {
  pending('PENDING'),
  sending('SENDING'),
  sent('SENT'),
  failed('FAILED'),
  conflict('CONFLICT');

  const OutboxStatus(this.dbValue);

  final String dbValue;

  static OutboxStatus fromDbValue(String value) {
    return OutboxStatus.values.firstWhere(
      (s) => s.dbValue == value,
      orElse: () => OutboxStatus.pending,
    );
  }
}
