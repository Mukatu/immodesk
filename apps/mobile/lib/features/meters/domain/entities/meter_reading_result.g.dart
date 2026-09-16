// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'meter_reading_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MeterReadingResult _$MeterReadingResultFromJson(Map<String, dynamic> json) =>
    _MeterReadingResult(
      id: json['id'] as String,
      previousIndex: (json['previousIndex'] as num).toInt(),
      consumption: (json['consumption'] as num).toInt(),
      rolloverApplied: json['rolloverApplied'] as bool? ?? false,
      isEstimated: json['isEstimated'] as bool? ?? false,
    );

Map<String, dynamic> _$MeterReadingResultToJson(_MeterReadingResult instance) =>
    <String, dynamic>{
      'id': instance.id,
      'previousIndex': instance.previousIndex,
      'consumption': instance.consumption,
      'rolloverApplied': instance.rolloverApplied,
      'isEstimated': instance.isEstimated,
    };
