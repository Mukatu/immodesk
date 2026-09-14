import 'package:freezed_annotation/freezed_annotation.dart';

import 'momo_provider.dart';
import 'momo_status.dart';

part 'momo_transaction.freezed.dart';
part 'momo_transaction.g.dart';

/// Sous-ensemble de `MomoTransaction` (contrat de phase 4) utile au mobile :
/// suivi d'une déclaration ou d'une initiation agrégateur, écrans d'attente
/// et de résultat.
@freezed
abstract class MomoTransaction with _$MomoTransaction {
  const factory MomoTransaction({
    required String id,
    required String channel,
    required MomoStatus status,
    required MomoProvider provider,
    String? merchantReference,
    String? providerTransactionId,
    String? aggregatorTransactionId,
    required String payerMsisdn,
    String? payeeMsisdn,
    required int amount,
    @Default(0) int feeAmount,
    int? netAmount,
    String? paymentId,
    String? rejectionReason,
    String? failureCode,
    String? failureMessage,
    String? expiresAt,
    String? clientRef,
  }) = _MomoTransaction;

  factory MomoTransaction.fromJson(Map<String, dynamic> json) =>
      _$MomoTransactionFromJson(json);
}

extension MomoTransactionChannel on MomoTransaction {
  bool get isAggregator => channel == 'AGGREGATOR';
  bool get isDeclared => channel == 'DECLARED';
}
