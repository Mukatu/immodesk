// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'meter.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MeterLastReading _$MeterLastReadingFromJson(Map<String, dynamic> json) =>
    _MeterLastReading(
      readingDate: json['readingDate'] as String,
      currentIndex: (json['currentIndex'] as num).toInt(),
    );

Map<String, dynamic> _$MeterLastReadingToJson(_MeterLastReading instance) =>
    <String, dynamic>{
      'readingDate': instance.readingDate,
      'currentIndex': instance.currentIndex,
    };

_Meter _$MeterFromJson(Map<String, dynamic> json) => _Meter(
  id: json['id'] as String,
  propertyId: json['propertyId'] as String,
  unitId: json['unitId'] as String?,
  meterType: $enumDecode(_$MeterTypeEnumMap, json['meterType']),
  serialNumber: json['serialNumber'] as String,
  isPrepaid: json['isPrepaid'] as bool? ?? false,
  isShared: json['isShared'] as bool? ?? false,
  digitsCount: (json['digitsCount'] as num?)?.toInt() ?? 5,
  measurementUnit: json['measurementUnit'] as String?,
  lastReading: json['lastReading'] == null
      ? null
      : MeterLastReading.fromJson(json['lastReading'] as Map<String, dynamic>),
);

Map<String, dynamic> _$MeterToJson(_Meter instance) => <String, dynamic>{
  'id': instance.id,
  'propertyId': instance.propertyId,
  'unitId': instance.unitId,
  'meterType': _$MeterTypeEnumMap[instance.meterType]!,
  'serialNumber': instance.serialNumber,
  'isPrepaid': instance.isPrepaid,
  'isShared': instance.isShared,
  'digitsCount': instance.digitsCount,
  'measurementUnit': instance.measurementUnit,
  'lastReading': instance.lastReading,
};

const _$MeterTypeEnumMap = {
  MeterType.electricityE2c: 'ELECTRICITY_E2C',
  MeterType.waterLcde: 'WATER_LCDE',
  MeterType.gas: 'GAS',
  MeterType.privateSubmeter: 'PRIVATE_SUBMETER',
  MeterType.solar: 'SOLAR',
  MeterType.other: 'OTHER',
};
