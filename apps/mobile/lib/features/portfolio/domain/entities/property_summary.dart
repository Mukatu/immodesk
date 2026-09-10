import 'package:freezed_annotation/freezed_annotation.dart';

import 'landlord_summary.dart';
import 'occupancy.dart';
import 'property_type.dart';

part 'property_summary.freezed.dart';
part 'property_summary.g.dart';

/// `PropertySummary` du contrat de phase 1 (liste des immeubles).
@freezed
abstract class PropertySummary with _$PropertySummary {
  const factory PropertySummary({
    required String id,
    String? code,
    required String name,
    required PropertyType propertyType,
    required String district,
    required String city,
    required LandlordSummary landlord,
    required Occupancy occupancy,
    String? coverDocumentId,
  }) = _PropertySummary;

  factory PropertySummary.fromJson(Map<String, dynamic> json) =>
      _$PropertySummaryFromJson(json);
}
