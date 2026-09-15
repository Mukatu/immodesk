import 'package:freezed_annotation/freezed_annotation.dart';

import 'commission_basis.dart';
import 'mandate_status.dart';

part 'mandate_detail.freezed.dart';
part 'mandate_detail.g.dart';

@freezed
abstract class MandateLandlordRef with _$MandateLandlordRef {
  const factory MandateLandlordRef({
    required String id,
    required String displayName,
    @Default(false) bool isDiaspora,
  }) = _MandateLandlordRef;

  factory MandateLandlordRef.fromJson(Map<String, dynamic> json) =>
      _$MandateLandlordRefFromJson(json);
}

/// `MandateDetail.landlordPortal` : suivi de l'invitation du bailleur
/// (`docs/api/phase7-contract.md`, section « Portail bailleur »).
@freezed
abstract class LandlordPortalInvitationStatus
    with _$LandlordPortalInvitationStatus {
  const factory LandlordPortalInvitationStatus({
    @Default(false) bool invited,
    String? invitedAt,
    @Default(false) bool activated,
    String? userId,
  }) = _LandlordPortalInvitationStatus;

  factory LandlordPortalInvitationStatus.fromJson(Map<String, dynamic> json) =>
      _$LandlordPortalInvitationStatusFromJson(json);
}

/// `MandateDetail` du contrat de phase 7 (champs utiles à la fiche mandat
/// mobile : les biens rattachés et les relevés ne sont pas affichés dans ce
/// périmètre, volontairement lecture seule et minimal).
@freezed
abstract class MandateDetail with _$MandateDetail {
  const factory MandateDetail({
    required String id,
    required String reference,
    required MandateStatus status,
    required MandateLandlordRef landlord,
    required CommissionBasis commissionBasis,
    int? commissionRateBps,
    int? commissionFlatAmount,
    @Default(defaultCommissionVatRateBps) int vatRateBps,
    required String startDate,
    String? endDate,
    @Default(10) int payoutDay,
    @Default('XAF') String currency,
    required LandlordPortalInvitationStatus landlordPortal,
  }) = _MandateDetail;

  factory MandateDetail.fromJson(Map<String, dynamic> json) =>
      _$MandateDetailFromJson(json);
}

extension MandateDetailDisplay on MandateDetail {
  /// Ex. `10,0 %` ou `Forfait` si la commission n'est pas au taux.
  String get commissionLabel {
    if (commissionRateBps != null) {
      return '${(commissionRateBps! / 100).toStringAsFixed(1)} %';
    }
    return 'Forfait';
  }
}
