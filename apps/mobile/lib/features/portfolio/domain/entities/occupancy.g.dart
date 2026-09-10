// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'occupancy.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Occupancy _$OccupancyFromJson(Map<String, dynamic> json) => _Occupancy(
  unitsCount: (json['unitsCount'] as num).toInt(),
  occupiedCount: (json['occupiedCount'] as num).toInt(),
  availableCount: (json['availableCount'] as num).toInt(),
  occupancyRateBps: (json['occupancyRateBps'] as num).toInt(),
);

Map<String, dynamic> _$OccupancyToJson(_Occupancy instance) =>
    <String, dynamic>{
      'unitsCount': instance.unitsCount,
      'occupiedCount': instance.occupiedCount,
      'availableCount': instance.availableCount,
      'occupancyRateBps': instance.occupancyRateBps,
    };
