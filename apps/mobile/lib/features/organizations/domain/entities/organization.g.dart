// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organization.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Organization _$OrganizationFromJson(Map<String, dynamic> json) =>
    _Organization(
      id: json['id'] as String,
      type: $enumDecode(_$OrganizationTypeEnumMap, json['type']),
      legalName: json['legalName'] as String,
      tradeName: json['tradeName'] as String?,
      slug: json['slug'] as String,
      city: json['city'] as String,
      district: json['district'] as String?,
      contactPhone: json['contactPhone'] as String,
      contactEmail: json['contactEmail'] as String?,
      logoUrl: json['logoUrl'] as String?,
      status: $enumDecode(_$OrganizationStatusEnumMap, json['status']),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$OrganizationToJson(_Organization instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': _$OrganizationTypeEnumMap[instance.type]!,
      'legalName': instance.legalName,
      'tradeName': instance.tradeName,
      'slug': instance.slug,
      'city': instance.city,
      'district': instance.district,
      'contactPhone': instance.contactPhone,
      'contactEmail': instance.contactEmail,
      'logoUrl': instance.logoUrl,
      'status': _$OrganizationStatusEnumMap[instance.status]!,
      'createdAt': instance.createdAt.toIso8601String(),
    };

const _$OrganizationTypeEnumMap = {
  OrganizationType.agency: 'AGENCY',
  OrganizationType.independentLandlord: 'INDEPENDENT_LANDLORD',
  OrganizationType.independentManager: 'INDEPENDENT_MANAGER',
};

const _$OrganizationStatusEnumMap = {
  OrganizationStatus.active: 'ACTIVE',
  OrganizationStatus.suspended: 'SUSPENDED',
};
