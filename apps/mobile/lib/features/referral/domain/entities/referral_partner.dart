import 'package:freezed_annotation/freezed_annotation.dart';

part 'referral_partner.freezed.dart';
part 'referral_partner.g.dart';

/// `referral_partner_status` du contrat (`docs/api/phase10-contract.md`,
/// § Énumérations) : quatre valeurs exactes du DDL, aucune autre n'existe.
enum ReferralPartnerStatus {
  @JsonValue('PENDING_VERIFICATION')
  pendingVerification,
  @JsonValue('ACTIVE')
  active,
  @JsonValue('SUSPENDED')
  suspended,
  @JsonValue('CLOSED')
  closed,
}

extension ReferralPartnerStatusLabel on ReferralPartnerStatus {
  String get label => switch (this) {
    ReferralPartnerStatus.pendingVerification => 'Vérification en cours',
    ReferralPartnerStatus.active => 'Actif',
    ReferralPartnerStatus.suspended => 'Suspendu',
    ReferralPartnerStatus.closed => 'Fermé',
  };
}

/// `ReferralPartnerDto` (`POST /v1/referral-partners`, `GET
/// /v1/referral-partners/me`) : profil du partenaire apporteur d'affaires,
/// son code de parrainage unique (`IMD-` + six caractères) et le cumul de
/// ses commissions par statut le plus simple à afficher (accumulé/payé).
@freezed
abstract class ReferralPartner with _$ReferralPartner {
  const factory ReferralPartner({
    required String id,
    required String partnerCode,
    required ReferralPartnerStatus status,
    String? displayName,
    required String totalAccruedAmount,
    required String totalPaidAmount,
    required String createdAt,
  }) = _ReferralPartner;

  factory ReferralPartner.fromJson(Map<String, dynamic> json) =>
      _$ReferralPartnerFromJson(json);
}
