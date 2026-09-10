// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'me_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MeResult _$MeResultFromJson(Map<String, dynamic> json) => _MeResult(
  user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
  organizations: (json['organizations'] as List<dynamic>)
      .map((e) => OrganizationMembership.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$MeResultToJson(_MeResult instance) => <String, dynamic>{
  'user': instance.user,
  'organizations': instance.organizations,
};
