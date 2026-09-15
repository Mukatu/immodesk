import 'package:freezed_annotation/freezed_annotation.dart';

import 'payment_method.dart';

part 'portal_profile.freezed.dart';
part 'portal_profile.g.dart';

/// Organisation gérant le bien du bailleur, telle qu'imbriquée dans
/// `GET /v1/portal/me` (`docs/api/phase7-contract.md`).
@freezed
abstract class PortalOrganizationRef with _$PortalOrganizationRef {
  const factory PortalOrganizationRef({
    required String id,
    required String name,
  }) = _PortalOrganizationRef;

  factory PortalOrganizationRef.fromJson(Map<String, dynamic> json) =>
      _$PortalOrganizationRefFromJson(json);
}

/// Bailleur authentifié sur le portail (rôle dérivé `LANDLORD_PORTAL`, sans
/// appartenance à `organization_members`).
@freezed
abstract class PortalLandlord with _$PortalLandlord {
  const factory PortalLandlord({
    required String id,
    required String displayName,
    required String primaryPhone,
    String? email,
    required String city,
    required String countryCode,
    required PaymentMethod payoutMethod,
  }) = _PortalLandlord;

  factory PortalLandlord.fromJson(Map<String, dynamic> json) =>
      _$PortalLandlordFromJson(json);
}

extension PortalLandlordDiaspora on PortalLandlord {
  /// Dérivé : `landlords.country_code` différent de `CG`
  /// (`docs/api/phase7-contract.md`, note sous les types).
  bool get isDiaspora => countryCode.toUpperCase() != 'CG';
}

/// Réponse de `GET /v1/portal/me`.
@freezed
abstract class PortalProfile with _$PortalProfile {
  const factory PortalProfile({
    required PortalLandlord landlord,
    required List<PortalOrganizationRef> organizations,
  }) = _PortalProfile;

  factory PortalProfile.fromJson(Map<String, dynamic> json) =>
      _$PortalProfileFromJson(json);
}
