// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AppUser _$AppUserFromJson(Map<String, dynamic> json) => _AppUser(
  id: json['id'] as String,
  phone: json['phone'] as String,
  fullName: json['fullName'] as String,
  email: json['email'] as String?,
  locale: json['locale'] as String,
  timezone: json['timezone'] as String,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$AppUserToJson(_AppUser instance) => <String, dynamic>{
  'id': instance.id,
  'phone': instance.phone,
  'fullName': instance.fullName,
  'email': instance.email,
  'locale': instance.locale,
  'timezone': instance.timezone,
  'createdAt': instance.createdAt.toIso8601String(),
};
