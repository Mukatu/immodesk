import 'package:freezed_annotation/freezed_annotation.dart';

part 'referral.freezed.dart';
part 'referral.g.dart';

/// `referral_source` du contrat : deux voies de rattachement seulement,
/// plus deux valeurs administratives (`docs/api/phase10-contract.md`,
/// § Apport d'affaires).
enum ReferralSource {
  @JsonValue('CODE_AT_SIGNUP')
  codeAtSignup,
  @JsonValue('PARTNER_REGISTERED_PROPERTY')
  partnerRegisteredProperty,
  @JsonValue('LINK')
  link,
  @JsonValue('MANUAL_ADMIN')
  manualAdmin,
}

/// `referral_status` : cycle de qualification d'un parrainage.
enum ReferralStatus {
  @JsonValue('PENDING')
  pending,
  @JsonValue('QUALIFIED')
  qualified,
  @JsonValue('ACTIVE')
  active,
  @JsonValue('EXPIRED')
  expired,
  @JsonValue('CANCELLED')
  cancelled,
}

extension ReferralStatusLabel on ReferralStatus {
  String get label => switch (this) {
    ReferralStatus.pending => 'En attente',
    ReferralStatus.qualified => 'Qualifié',
    ReferralStatus.active => 'Actif',
    ReferralStatus.expired => 'Expiré',
    ReferralStatus.cancelled => 'Annulé',
  };
}

/// `ReferralDto` (`GET /v1/referral-partners/me/referrals`) : un filleul
/// (organisation) rattaché au partenaire, avec son statut de qualification.
@freezed
abstract class Referral with _$Referral {
  const factory Referral({
    required String id,
    required String partnerId,
    required String referredOrganizationId,
    String? referredPropertyId,
    required ReferralSource source,
    required ReferralStatus status,
    String? qualifiedAt,
    String? activatedAt,
    String? expiresAt,
    required String createdAt,
  }) = _Referral;

  factory Referral.fromJson(Map<String, dynamic> json) =>
      _$ReferralFromJson(json);
}
