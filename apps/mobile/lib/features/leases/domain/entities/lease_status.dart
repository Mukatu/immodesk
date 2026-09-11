import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `LeaseStatus` du contrat d'API (`docs/api/phase2-contract.md`).
enum LeaseStatus {
  @JsonValue('DRAFT')
  draft,
  @JsonValue('PENDING_SIGNATURE')
  pendingSignature,
  @JsonValue('ACTIVE')
  active,
  @JsonValue('NOTICE_GIVEN')
  noticeGiven,
  @JsonValue('TERMINATED')
  terminated,
  @JsonValue('EXPIRED')
  expired,
  @JsonValue('CANCELLED')
  cancelled,
}

extension LeaseStatusLabel on LeaseStatus {
  String get label => switch (this) {
    LeaseStatus.draft => 'Brouillon',
    LeaseStatus.pendingSignature => 'En attente de signature',
    LeaseStatus.active => 'Actif',
    LeaseStatus.noticeGiven => 'Préavis déposé',
    LeaseStatus.terminated => 'Résilié',
    LeaseStatus.expired => 'Expiré',
    LeaseStatus.cancelled => 'Annulé',
  };

  StatusBadgeTone get tone => switch (this) {
    LeaseStatus.draft => StatusBadgeTone.neutral,
    LeaseStatus.pendingSignature => StatusBadgeTone.info,
    LeaseStatus.active => StatusBadgeTone.success,
    LeaseStatus.noticeGiven => StatusBadgeTone.warning,
    LeaseStatus.terminated => StatusBadgeTone.danger,
    LeaseStatus.expired => StatusBadgeTone.danger,
    LeaseStatus.cancelled => StatusBadgeTone.neutral,
  };

  /// Un bail est considéré « actif » à l'affichage (fiche lot / locataire)
  /// s'il facture toujours un loyer : `ACTIVE` ou en préavis `NOTICE_GIVEN`.
  bool get isActive =>
      this == LeaseStatus.active || this == LeaseStatus.noticeGiven;
}

const Map<String, LeaseStatus> _leaseStatusByApiValue = {
  'DRAFT': LeaseStatus.draft,
  'PENDING_SIGNATURE': LeaseStatus.pendingSignature,
  'ACTIVE': LeaseStatus.active,
  'NOTICE_GIVEN': LeaseStatus.noticeGiven,
  'TERMINATED': LeaseStatus.terminated,
  'EXPIRED': LeaseStatus.expired,
  'CANCELLED': LeaseStatus.cancelled,
};

const Map<LeaseStatus, String> _leaseStatusToApiValue = {
  LeaseStatus.draft: 'DRAFT',
  LeaseStatus.pendingSignature: 'PENDING_SIGNATURE',
  LeaseStatus.active: 'ACTIVE',
  LeaseStatus.noticeGiven: 'NOTICE_GIVEN',
  LeaseStatus.terminated: 'TERMINATED',
  LeaseStatus.expired: 'EXPIRED',
  LeaseStatus.cancelled: 'CANCELLED',
};

/// Convertit la valeur API (`SCREAMING_SNAKE_CASE`) en [LeaseStatus].
///
/// Utilisé par `LeaseDetail.fromJson` (parsing manuel) et par le datasource
/// distant pour construire les paramètres de requête `?status=`.
LeaseStatus leaseStatusFromApiValue(String value) {
  final LeaseStatus? status = _leaseStatusByApiValue[value];
  if (status == null) {
    throw FormatException('Statut de bail inconnu : $value');
  }
  return status;
}

/// Valeur API correspondant à ce statut, ex. pour le paramètre `?status=`.
String leaseStatusToApiValue(LeaseStatus status) =>
    _leaseStatusToApiValue[status]!;
