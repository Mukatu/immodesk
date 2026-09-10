// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tenant.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Tenant _$TenantFromJson(Map<String, dynamic> json) => _Tenant(
  id: json['id'] as String,
  displayName: json['displayName'] as String,
  primaryPhone: json['primaryPhone'] as String,
  secondaryPhone: json['secondaryPhone'] as String?,
  whatsappPhone: json['whatsappPhone'] as String?,
  email: json['email'] as String?,
  addressLine: json['addressLine'] as String?,
  district: json['district'] as String?,
  city: json['city'] as String?,
);

Map<String, dynamic> _$TenantToJson(_Tenant instance) => <String, dynamic>{
  'id': instance.id,
  'displayName': instance.displayName,
  'primaryPhone': instance.primaryPhone,
  'secondaryPhone': instance.secondaryPhone,
  'whatsappPhone': instance.whatsappPhone,
  'email': instance.email,
  'addressLine': instance.addressLine,
  'district': instance.district,
  'city': instance.city,
};
