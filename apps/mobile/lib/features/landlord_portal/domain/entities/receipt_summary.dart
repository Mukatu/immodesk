import 'package:freezed_annotation/freezed_annotation.dart';

part 'receipt_summary.freezed.dart';
part 'receipt_summary.g.dart';

@freezed
abstract class ReceiptSummaryTenantRef with _$ReceiptSummaryTenantRef {
  const factory ReceiptSummaryTenantRef({
    required String id,
    required String displayName,
  }) = _ReceiptSummaryTenantRef;

  factory ReceiptSummaryTenantRef.fromJson(Map<String, dynamic> json) =>
      _$ReceiptSummaryTenantRefFromJson(json);
}

@freezed
abstract class ReceiptSummaryUnitRef with _$ReceiptSummaryUnitRef {
  const factory ReceiptSummaryUnitRef({
    required String id,
    required String code,
  }) = _ReceiptSummaryUnitRef;

  factory ReceiptSummaryUnitRef.fromJson(Map<String, dynamic> json) =>
      _$ReceiptSummaryUnitRefFromJson(json);
}

/// `ReceiptSummary` : type non détaillé par le contrat de phase 7 (routes
/// uniquement, `GET /v1/portal/receipts`) — champs déduits de `receipts`
/// (référentiel commun : PDF, token QR de vérification publique) et de
/// `ReceiptDeliveryController` (phase 3). `downloadUrl` est une URL signée
/// déjà valide, embarquée directement dans l'élément de liste : contrat
/// portail sans `documents.id` exploitable côté bailleur.
@freezed
abstract class ReceiptSummary with _$ReceiptSummary {
  const factory ReceiptSummary({
    required String id,
    required String receiptNumber,
    required int amount,
    required String receivedAt,
    required ReceiptSummaryTenantRef tenant,
    required ReceiptSummaryUnitRef unit,
    required String downloadUrl,
  }) = _ReceiptSummary;

  factory ReceiptSummary.fromJson(Map<String, dynamic> json) =>
      _$ReceiptSummaryFromJson(json);
}
