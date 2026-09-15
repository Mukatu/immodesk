import 'package:json_annotation/json_annotation.dart';

import '../../../../shared/widgets/status_badge.dart';

/// `MandateStatus` du contrat de phase 7.
enum MandateStatus {
  @JsonValue('DRAFT')
  draft,
  @JsonValue('ACTIVE')
  active,
  @JsonValue('SUSPENDED')
  suspended,
  @JsonValue('TERMINATED')
  terminated,
  @JsonValue('EXPIRED')
  expired,
}

extension MandateStatusLabel on MandateStatus {
  String get label => switch (this) {
    MandateStatus.draft => 'Brouillon',
    MandateStatus.active => 'Actif',
    MandateStatus.suspended => 'Suspendu',
    MandateStatus.terminated => 'Résilié',
    MandateStatus.expired => 'Expiré',
  };

  StatusBadgeTone get tone => switch (this) {
    MandateStatus.draft => StatusBadgeTone.neutral,
    MandateStatus.active => StatusBadgeTone.success,
    MandateStatus.suspended => StatusBadgeTone.warning,
    MandateStatus.terminated => StatusBadgeTone.danger,
    MandateStatus.expired => StatusBadgeTone.danger,
  };
}

/// `MandateScope` du contrat de phase 7.
enum MandateScope {
  @JsonValue('FULL_MANAGEMENT')
  fullManagement,
  @JsonValue('RENT_COLLECTION_ONLY')
  rentCollectionOnly,
  @JsonValue('LETTING_ONLY')
  lettingOnly,
}

extension MandateScopeLabel on MandateScope {
  String get label => switch (this) {
    MandateScope.fullManagement => 'Gérance complète',
    MandateScope.rentCollectionOnly => 'Encaissement seul',
    MandateScope.lettingOnly => 'Mise en location seule',
  };
}
