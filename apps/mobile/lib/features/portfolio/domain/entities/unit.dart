import 'package:freezed_annotation/freezed_annotation.dart';

import 'unit_status.dart';
import 'unit_type.dart';

part 'unit.freezed.dart';
part 'unit.g.dart';

/// `Unit` du contrat de phase 1 : caractéristiques d'un lot et loyer de
/// référence (toujours un entier XAF).
@freezed
abstract class Unit with _$Unit {
  const factory Unit({
    required String id,
    required String propertyId,
    required String code,
    String? label,
    UnitType? unitType,
    required UnitStatus status,
    int? floorNumber,
    int? roomsCount,
    int? bedroomsCount,
    int? bathroomsCount,
    double? areaSqm,
    bool? isFurnished,
    required int baseRentAmount,
    int? baseChargesAmount,
  }) = _Unit;

  factory Unit.fromJson(Map<String, dynamic> json) => _$UnitFromJson(json);
}
