import 'package:freezed_annotation/freezed_annotation.dart';

part 'referral_commission.freezed.dart';
part 'referral_commission.g.dart';

/// `referral_commission_status` : à ne pas confondre avec `commission_status`
/// de la phase 7 (gérance), qui n'a rien à voir (contrat, § Énumérations).
enum ReferralCommissionStatus {
  @JsonValue('ACCRUED')
  accrued,
  @JsonValue('APPROVED')
  approved,
  @JsonValue('PAID')
  paid,
  @JsonValue('REVERSED')
  reversed,
  @JsonValue('CANCELLED')
  cancelled,
}

extension ReferralCommissionStatusLabel on ReferralCommissionStatus {
  String get label => switch (this) {
    ReferralCommissionStatus.accrued => 'Comptabilisée',
    ReferralCommissionStatus.approved => 'Approuvée',
    ReferralCommissionStatus.paid => 'Versée',
    ReferralCommissionStatus.reversed => 'Contre-passée',
    ReferralCommissionStatus.cancelled => 'Annulée',
  };
}

/// `ReferralCommissionDto` (`GET /v1/referral-partners/me/commissions`).
@freezed
abstract class ReferralCommission with _$ReferralCommission {
  const factory ReferralCommission({
    required String id,
    required String referralId,
    required String baseAmount,
    required int rateBps,
    required String commissionAmount,
    required ReferralCommissionStatus status,
    String? periodMonth,
    required String accruedAt,
    String? reversalOfId,
  }) = _ReferralCommission;

  factory ReferralCommission.fromJson(Map<String, dynamic> json) =>
      _$ReferralCommissionFromJson(json);
}

/// `ReferralCommissionTotalsDto` : cumul par statut, en XAF sous forme de
/// chaîne (montants potentiellement supérieurs à la précision d'un `double`).
///
/// Classe immuable écrite à la main (pas `@freezed`) : les clés JSON sont
/// les valeurs d'énumération en MAJUSCULES (`ACCRUED`, `APPROVED`…), ce que
/// `@JsonKey` ne peut pas exprimer proprement sur un constructeur `factory`
/// abstrait sans déclencher `invalid_annotation_target`.
class ReferralCommissionTotals {
  const ReferralCommissionTotals({
    required this.accrued,
    required this.approved,
    required this.paid,
    required this.reversed,
    required this.cancelled,
  });

  final String accrued;
  final String approved;
  final String paid;
  final String reversed;
  final String cancelled;

  factory ReferralCommissionTotals.fromJson(Map<String, dynamic> json) {
    return ReferralCommissionTotals(
      accrued: json['ACCRUED'] as String? ?? '0',
      approved: json['APPROVED'] as String? ?? '0',
      paid: json['PAID'] as String? ?? '0',
      reversed: json['REVERSED'] as String? ?? '0',
      cancelled: json['CANCELLED'] as String? ?? '0',
    );
  }
}
