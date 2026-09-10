import 'package:freezed_annotation/freezed_annotation.dart';

part 'occupancy.freezed.dart';
part 'occupancy.g.dart';

/// Taux d'occupation d'un immeuble (`Occupancy` du contrat de phase 1).
@freezed
abstract class Occupancy with _$Occupancy {
  const factory Occupancy({
    required int unitsCount,
    required int occupiedCount,
    required int availableCount,
    required int occupancyRateBps,
  }) = _Occupancy;

  factory Occupancy.fromJson(Map<String, dynamic> json) =>
      _$OccupancyFromJson(json);
}

extension OccupancyDisplay on Occupancy {
  /// Ex. `8/10 lots occupés`.
  String get summaryLabel => '$occupiedCount/$unitsCount lots occupés';

  /// Taux d'occupation en pourcentage entier, ex. `80 %`.
  String get percentLabel => '${(occupancyRateBps / 100).round()} %';
}
