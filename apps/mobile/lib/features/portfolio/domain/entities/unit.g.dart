// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'unit.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Unit _$UnitFromJson(Map<String, dynamic> json) => _Unit(
  id: json['id'] as String,
  propertyId: json['propertyId'] as String,
  code: json['code'] as String,
  label: json['label'] as String?,
  unitType: $enumDecodeNullable(_$UnitTypeEnumMap, json['unitType']),
  status: $enumDecode(_$UnitStatusEnumMap, json['status']),
  floorNumber: (json['floorNumber'] as num?)?.toInt(),
  roomsCount: (json['roomsCount'] as num?)?.toInt(),
  bedroomsCount: (json['bedroomsCount'] as num?)?.toInt(),
  bathroomsCount: (json['bathroomsCount'] as num?)?.toInt(),
  areaSqm: (json['areaSqm'] as num?)?.toDouble(),
  isFurnished: json['isFurnished'] as bool?,
  baseRentAmount: (json['baseRentAmount'] as num).toInt(),
  baseChargesAmount: (json['baseChargesAmount'] as num?)?.toInt(),
);

Map<String, dynamic> _$UnitToJson(_Unit instance) => <String, dynamic>{
  'id': instance.id,
  'propertyId': instance.propertyId,
  'code': instance.code,
  'label': instance.label,
  'unitType': _$UnitTypeEnumMap[instance.unitType],
  'status': _$UnitStatusEnumMap[instance.status]!,
  'floorNumber': instance.floorNumber,
  'roomsCount': instance.roomsCount,
  'bedroomsCount': instance.bedroomsCount,
  'bathroomsCount': instance.bathroomsCount,
  'areaSqm': instance.areaSqm,
  'isFurnished': instance.isFurnished,
  'baseRentAmount': instance.baseRentAmount,
  'baseChargesAmount': instance.baseChargesAmount,
};

const _$UnitTypeEnumMap = {
  UnitType.studio: 'STUDIO',
  UnitType.room: 'ROOM',
  UnitType.apartment: 'APARTMENT',
  UnitType.house: 'HOUSE',
  UnitType.shop: 'SHOP',
  UnitType.office: 'OFFICE',
  UnitType.warehouse: 'WAREHOUSE',
  UnitType.parking: 'PARKING',
  UnitType.landPlot: 'LAND_PLOT',
  UnitType.other: 'OTHER',
};

const _$UnitStatusEnumMap = {
  UnitStatus.available: 'AVAILABLE',
  UnitStatus.reserved: 'RESERVED',
  UnitStatus.occupied: 'OCCUPIED',
  UnitStatus.underMaintenance: 'UNDER_MAINTENANCE',
  UnitStatus.unavailable: 'UNAVAILABLE',
};
