/// Types d'opération de l'enveloppe de synchronisation
/// (`docs/api/phase5-contract.md`) : « le protocole est générique, les
/// types d'opérations sont ceux qui existent ». Ajouter un type en phase 8
/// ne doit modifier ni la route, ni le format, ni le moteur de rejeu — voir
/// `SyncEngine`.
enum OutboxOperationType {
  cashReceipt('CASH_RECEIPT'),
  document('DOCUMENT'),

  /// Phase 8 : dépôt d'un état des lieux complet (postes, photos et double
  /// signature) en une seule opération, traitée atomiquement côté serveur —
  /// il n'existe aucune route en ligne unique équivalente (création, postes,
  /// photos et signature sont des routes distinctes), donc l'écriture de
  /// terrain est bâtie localement puis soumise d'un bloc, comme le prescrit
  /// `docs/api/phase5-contract.md` (« ajouter un type ne doit modifier ni la
  /// route, ni le format d'enveloppe, ni le moteur de rejeu »).
  inspectionSubmit('INSPECTION_SUBMIT'),

  /// Phase 8 : relevé de compteur (`POST /v1/meters/{id}/readings`).
  meterReading('METER_READING'),

  /// Phase 8 : mise à jour d'une demande de maintenance
  /// (`POST /v1/maintenance-requests/{id}/updates`).
  maintenanceUpdate('MAINTENANCE_UPDATE');

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
