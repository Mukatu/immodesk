import 'package:freezed_annotation/freezed_annotation.dart';

import 'invoice_status.dart';

part 'invoice_summary.freezed.dart';
part 'invoice_summary.g.dart';

/// Référence légère vers un bail, telle qu'imbriquée dans `InvoiceSummary`.
@freezed
abstract class InvoiceLeaseRef with _$InvoiceLeaseRef {
  const factory InvoiceLeaseRef({required String id, String? reference}) =
      _InvoiceLeaseRef;

  factory InvoiceLeaseRef.fromJson(Map<String, dynamic> json) =>
      _$InvoiceLeaseRefFromJson(json);
}

/// Référence légère vers le locataire.
@freezed
abstract class InvoiceTenantRef with _$InvoiceTenantRef {
  const factory InvoiceTenantRef({
    required String id,
    required String displayName,
    required String primaryPhone,
  }) = _InvoiceTenantRef;

  factory InvoiceTenantRef.fromJson(Map<String, dynamic> json) =>
      _$InvoiceTenantRefFromJson(json);
}

/// Référence légère vers le lot.
@freezed
abstract class InvoiceUnitRef with _$InvoiceUnitRef {
  const factory InvoiceUnitRef({required String id, required String code}) =
      _InvoiceUnitRef;

  factory InvoiceUnitRef.fromJson(Map<String, dynamic> json) =>
      _$InvoiceUnitRefFromJson(json);
}

/// Référence légère vers l'immeuble.
@freezed
abstract class InvoicePropertyRef with _$InvoicePropertyRef {
  const factory InvoicePropertyRef({required String id, required String name}) =
      _InvoicePropertyRef;

  factory InvoicePropertyRef.fromJson(Map<String, dynamic> json) =>
      _$InvoicePropertyRefFromJson(json);
}

/// `InvoiceSummary` du contrat de phase 3 (`GET /v1/invoices`). Pour un
/// `COLLECTOR`, l'API ne renvoie que les factures des lots dont il est le
/// démarcheur affecté (`collectorUserId` du bail).
@freezed
abstract class InvoiceSummary with _$InvoiceSummary {
  const factory InvoiceSummary({
    required String id,
    String? invoiceNumber,
    required InvoiceStatus status,
    required InvoiceLeaseRef lease,
    required InvoiceTenantRef tenant,
    required InvoiceUnitRef unit,
    required InvoicePropertyRef property,
    required String periodStart,
    required String periodEnd,
    required String dueDate,
    String? graceUntilDate,
    required int totalAmount,
    required int paidAmount,
    required int balanceAmount,
  }) = _InvoiceSummary;

  factory InvoiceSummary.fromJson(Map<String, dynamic> json) =>
      _$InvoiceSummaryFromJson(json);
}
