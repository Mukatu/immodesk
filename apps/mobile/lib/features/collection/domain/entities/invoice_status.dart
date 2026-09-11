import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `InvoiceStatus` du contrat d'API (`docs/api/phase3-contract.md`).
enum InvoiceStatus {
  @JsonValue('DRAFT')
  draft,
  @JsonValue('ISSUED')
  issued,
  @JsonValue('PARTIALLY_PAID')
  partiallyPaid,
  @JsonValue('PAID')
  paid,
  @JsonValue('OVERDUE')
  overdue,
  @JsonValue('CANCELLED')
  cancelled,
}

extension InvoiceStatusLabel on InvoiceStatus {
  String get label => switch (this) {
    InvoiceStatus.draft => 'Brouillon',
    InvoiceStatus.issued => 'Émise',
    InvoiceStatus.partiallyPaid => 'Partiellement réglée',
    InvoiceStatus.paid => 'Réglée',
    InvoiceStatus.overdue => 'En retard',
    InvoiceStatus.cancelled => 'Annulée',
  };

  StatusBadgeTone get tone => switch (this) {
    InvoiceStatus.draft => StatusBadgeTone.neutral,
    InvoiceStatus.issued => StatusBadgeTone.info,
    InvoiceStatus.partiallyPaid => StatusBadgeTone.warning,
    InvoiceStatus.paid => StatusBadgeTone.success,
    InvoiceStatus.overdue => StatusBadgeTone.danger,
    InvoiceStatus.cancelled => StatusBadgeTone.neutral,
  };

  /// Facture encore due (montant restant à recouvrer) pour la tournée du
  /// démarcheur : émise, partiellement réglée ou en retard.
  bool get isDue =>
      this == InvoiceStatus.issued ||
      this == InvoiceStatus.partiallyPaid ||
      this == InvoiceStatus.overdue;
}

const Map<String, InvoiceStatus> _invoiceStatusByApiValue = {
  'DRAFT': InvoiceStatus.draft,
  'ISSUED': InvoiceStatus.issued,
  'PARTIALLY_PAID': InvoiceStatus.partiallyPaid,
  'PAID': InvoiceStatus.paid,
  'OVERDUE': InvoiceStatus.overdue,
  'CANCELLED': InvoiceStatus.cancelled,
};

const Map<InvoiceStatus, String> _invoiceStatusToApiValue = {
  InvoiceStatus.draft: 'DRAFT',
  InvoiceStatus.issued: 'ISSUED',
  InvoiceStatus.partiallyPaid: 'PARTIALLY_PAID',
  InvoiceStatus.paid: 'PAID',
  InvoiceStatus.overdue: 'OVERDUE',
  InvoiceStatus.cancelled: 'CANCELLED',
};

/// Convertit la valeur API (`SCREAMING_SNAKE_CASE`) en [InvoiceStatus].
InvoiceStatus invoiceStatusFromApiValue(String value) {
  final InvoiceStatus? status = _invoiceStatusByApiValue[value];
  if (status == null) {
    throw FormatException('Statut de facture inconnu : $value');
  }
  return status;
}

/// Valeur API correspondant à ce statut.
String invoiceStatusToApiValue(InvoiceStatus status) =>
    _invoiceStatusToApiValue[status]!;
