import 'package:freezed_annotation/freezed_annotation.dart';

import 'lease_status.dart';

part 'lease_summary.freezed.dart';
part 'lease_summary.g.dart';

/// Référence légère vers un lot, telle qu'imbriquée dans `LeaseSummary` et
/// `LeaseDetail` (contrat de phase 2).
@freezed
abstract class LeaseUnitRef with _$LeaseUnitRef {
  const factory LeaseUnitRef({
    required String id,
    required String code,
    String? label,
  }) = _LeaseUnitRef;

  factory LeaseUnitRef.fromJson(Map<String, dynamic> json) =>
      _$LeaseUnitRefFromJson(json);
}

/// Référence légère vers un immeuble.
@freezed
abstract class LeasePropertyRef with _$LeasePropertyRef {
  const factory LeasePropertyRef({required String id, required String name}) =
      _LeasePropertyRef;

  factory LeasePropertyRef.fromJson(Map<String, dynamic> json) =>
      _$LeasePropertyRefFromJson(json);
}

/// Référence légère vers le locataire principal.
@freezed
abstract class LeaseTenantRef with _$LeaseTenantRef {
  const factory LeaseTenantRef({
    required String id,
    required String displayName,
    required String primaryPhone,
  }) = _LeaseTenantRef;

  factory LeaseTenantRef.fromJson(Map<String, dynamic> json) =>
      _$LeaseTenantRefFromJson(json);
}

/// `LeaseSummary` du contrat de phase 2 (liste des baux de l'organisation).
///
/// Remarque : les champs communs avec `LeaseDetail` portent les mêmes noms
/// JSON (`unit`, `property`, `tenant`…) afin qu'une ligne de cache Drift
/// alimentée par un `LeaseDetail` complet reste lisible par
/// `LeaseSummary.fromJson` (les clés en trop sont simplement ignorées).
@freezed
abstract class LeaseSummary with _$LeaseSummary {
  const factory LeaseSummary({
    required String id,
    String? reference,
    required LeaseStatus status,
    required LeaseUnitRef unit,
    required LeasePropertyRef property,
    required LeaseTenantRef tenant,
    required String startDate,
    String? endDate,
    required int rentAmount,
    @Default(0) int chargesAmount,
    required int paymentDueDay,
  }) = _LeaseSummary;

  factory LeaseSummary.fromJson(Map<String, dynamic> json) =>
      _$LeaseSummaryFromJson(json);
}
