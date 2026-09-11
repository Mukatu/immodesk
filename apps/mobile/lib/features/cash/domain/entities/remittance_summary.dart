import 'package:freezed_annotation/freezed_annotation.dart';

import 'remittance_status.dart';

part 'remittance_summary.freezed.dart';
part 'remittance_summary.g.dart';

/// `RemittanceSummary` du contrat de phase 3
/// (`GET /v1/cash-remittances`) : suivi des remises du démarcheur.
@freezed
abstract class RemittanceSummary with _$RemittanceSummary {
  const factory RemittanceSummary({
    required String id,
    required String reference,
    required RemittanceStatus status,
    required String collectorUserId,
    required String collectorName,
    required int declaredAmount,
    required int expectedAmount,
    required int countedAmount,
    required int varianceAmount,
    required int receiptsCount,
    required String openedAt,
    String? submittedAt,
    String? verifiedAt,
  }) = _RemittanceSummary;

  factory RemittanceSummary.fromJson(Map<String, dynamic> json) =>
      _$RemittanceSummaryFromJson(json);
}
