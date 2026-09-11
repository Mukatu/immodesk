import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `CashReceiptStatus` du contrat d'API (`docs/api/phase3-contract.md`).
enum CashReceiptStatus {
  @JsonValue('DRAFT')
  draft,
  @JsonValue('ISSUED')
  issued,
  @JsonValue('REMITTED')
  remitted,
  @JsonValue('CANCELLED')
  cancelled,
}

extension CashReceiptStatusLabel on CashReceiptStatus {
  String get label => switch (this) {
    CashReceiptStatus.draft => 'Brouillon',
    CashReceiptStatus.issued => 'En caisse',
    CashReceiptStatus.remitted => 'Remis',
    CashReceiptStatus.cancelled => 'Annulé',
  };

  StatusBadgeTone get tone => switch (this) {
    CashReceiptStatus.draft => StatusBadgeTone.neutral,
    CashReceiptStatus.issued => StatusBadgeTone.warning,
    CashReceiptStatus.remitted => StatusBadgeTone.success,
    CashReceiptStatus.cancelled => StatusBadgeTone.neutral,
  };
}

const Map<String, CashReceiptStatus> _byApiValue = {
  'DRAFT': CashReceiptStatus.draft,
  'ISSUED': CashReceiptStatus.issued,
  'REMITTED': CashReceiptStatus.remitted,
  'CANCELLED': CashReceiptStatus.cancelled,
};

CashReceiptStatus cashReceiptStatusFromApiValue(String value) {
  final CashReceiptStatus? status = _byApiValue[value];
  if (status == null) {
    throw FormatException('Statut de reçu de caisse inconnu : $value');
  }
  return status;
}
