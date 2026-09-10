// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'property_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PropertySummary _$PropertySummaryFromJson(Map<String, dynamic> json) =>
    _PropertySummary(
      id: json['id'] as String,
      code: json['code'] as String?,
      name: json['name'] as String,
      propertyType: $enumDecode(_$PropertyTypeEnumMap, json['propertyType']),
      district: json['district'] as String,
      city: json['city'] as String,
      landlord: LandlordSummary.fromJson(
        json['landlord'] as Map<String, dynamic>,
      ),
      occupancy: Occupancy.fromJson(json['occupancy'] as Map<String, dynamic>),
      coverDocumentId: json['coverDocumentId'] as String?,
    );

Map<String, dynamic> _$PropertySummaryToJson(_PropertySummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'name': instance.name,
      'propertyType': _$PropertyTypeEnumMap[instance.propertyType]!,
      'district': instance.district,
      'city': instance.city,
      'landlord': instance.landlord,
      'occupancy': instance.occupancy,
      'coverDocumentId': instance.coverDocumentId,
    };

const _$PropertyTypeEnumMap = {
  PropertyType.house: 'HOUSE',
  PropertyType.villa: 'VILLA',
  PropertyType.apartmentBuilding: 'APARTMENT_BUILDING',
  PropertyType.compound: 'COMPOUND',
  PropertyType.commercialBuilding: 'COMMERCIAL_BUILDING',
  PropertyType.mixedUse: 'MIXED_USE',
  PropertyType.land: 'LAND',
  PropertyType.warehouse: 'WAREHOUSE',
  PropertyType.other: 'OTHER',
};
