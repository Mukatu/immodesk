import 'package:freezed_annotation/freezed_annotation.dart';

import 'payment_method.dart';
import 'payout_status.dart';

part 'owner_payout.freezed.dart';
part 'owner_payout.g.dart';

/// `Payout` du contrat de phase 7, tel que renvoyé par
/// `GET /v1/portal/payouts`.
@freezed
abstract class OwnerPayout with _$OwnerPayout {
  const factory OwnerPayout({
    required String id,
    required String reference,
    String? statementId,
    required PayoutStatus status,
    required PaymentMethod method,
    required int amount,
    @Default(0) int feeAmount,
    required int netAmount,
    String? scheduledDate,
    String? approvedAt,
    String? paidAt,
    String? failureReason,
  }) = _OwnerPayout;

  factory OwnerPayout.fromJson(Map<String, dynamic> json) =>
      _$OwnerPayoutFromJson(json);
}

/// Le reversement perçu le plus récent (par date de paiement, sinon par
/// date planifiée), `null` si aucun.
OwnerPayout? mostRecentPayout(List<OwnerPayout> payouts) {
  if (payouts.isEmpty) return null;
  final List<OwnerPayout> sorted = [...payouts]
    ..sort((a, b) {
      final String aKey = a.paidAt ?? a.scheduledDate ?? '';
      final String bKey = b.paidAt ?? b.scheduledDate ?? '';
      return bKey.compareTo(aKey);
    });
  return sorted.first;
}
