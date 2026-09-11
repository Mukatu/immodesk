import 'package:freezed_annotation/freezed_annotation.dart';

import 'cash_receipt_status.dart';

part 'cash_receipt_summary.freezed.dart';
part 'cash_receipt_summary.g.dart';

/// Référence légère vers le locataire, telle qu'imbriquée dans
/// `CashReceiptSummary`.
@freezed
abstract class CashReceiptSummaryTenantRef with _$CashReceiptSummaryTenantRef {
  const factory CashReceiptSummaryTenantRef({
    required String id,
    required String displayName,
  }) = _CashReceiptSummaryTenantRef;

  factory CashReceiptSummaryTenantRef.fromJson(Map<String, dynamic> json) =>
      _$CashReceiptSummaryTenantRefFromJson(json);
}

/// `CashReceiptSummary` du contrat de phase 3 (`GET /v1/cash-receipts`),
/// utilisé pour la liste des reçus non remis de « Ma caisse ».
@freezed
abstract class CashReceiptSummary with _$CashReceiptSummary {
  const factory CashReceiptSummary({
    required String id,
    required String receiptNumber,
    required CashReceiptStatus status,
    required int amount,
    required String receivedAt,
    required CashReceiptSummaryTenantRef tenant,
    required String collectorUserId,
    required String collectorName,
    String? remittanceId,
    String? paymentId,
  }) = _CashReceiptSummary;

  factory CashReceiptSummary.fromJson(Map<String, dynamic> json) =>
      _$CashReceiptSummaryFromJson(json);
}
