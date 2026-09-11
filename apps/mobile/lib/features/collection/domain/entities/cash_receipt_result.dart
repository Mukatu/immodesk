import 'package:freezed_annotation/freezed_annotation.dart';

part 'cash_receipt_result.freezed.dart';
part 'cash_receipt_result.g.dart';

/// Référence légère vers le locataire, telle qu'imbriquée dans
/// `CashReceiptResult`.
@freezed
abstract class CashReceiptTenantRef with _$CashReceiptTenantRef {
  const factory CashReceiptTenantRef({
    required String id,
    required String displayName,
  }) = _CashReceiptTenantRef;

  factory CashReceiptTenantRef.fromJson(Map<String, dynamic> json) =>
      _$CashReceiptTenantRefFromJson(json);
}

/// Sous-ensemble de `CashReceiptDetail` (`POST /v1/cash-receipts`) utile à
/// l'écran de confirmation : numéro de reçu, montant, locataire, document
/// PDF (récupéré séparément via `download-url`).
@freezed
abstract class CashReceiptResult with _$CashReceiptResult {
  const factory CashReceiptResult({
    required String id,
    required String receiptNumber,
    required String status,
    required int amount,
    required String receivedAt,
    required CashReceiptTenantRef tenant,
    String? documentId,
    String? clientRef,
  }) = _CashReceiptResult;

  factory CashReceiptResult.fromJson(Map<String, dynamic> json) =>
      _$CashReceiptResultFromJson(json);
}
