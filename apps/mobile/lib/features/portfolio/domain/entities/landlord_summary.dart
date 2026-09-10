import 'package:freezed_annotation/freezed_annotation.dart';

part 'landlord_summary.freezed.dart';
part 'landlord_summary.g.dart';

/// `LandlordSummary` du contrat de phase 1.
@freezed
abstract class LandlordSummary with _$LandlordSummary {
  const factory LandlordSummary({
    required String id,
    required String displayName,
    required String primaryPhone,
    required bool isSelf,
  }) = _LandlordSummary;

  factory LandlordSummary.fromJson(Map<String, dynamic> json) =>
      _$LandlordSummaryFromJson(json);
}
