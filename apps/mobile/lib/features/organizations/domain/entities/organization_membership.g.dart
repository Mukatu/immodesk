// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organization_membership.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OrganizationMembership _$OrganizationMembershipFromJson(
  Map<String, dynamic> json,
) => _OrganizationMembership(
  organization: Organization.fromJson(
    json['organization'] as Map<String, dynamic>,
  ),
  role: $enumDecode(_$RoleEnumMap, json['role']),
  joinedAt: DateTime.parse(json['joinedAt'] as String),
);

Map<String, dynamic> _$OrganizationMembershipToJson(
  _OrganizationMembership instance,
) => <String, dynamic>{
  'organization': instance.organization,
  'role': _$RoleEnumMap[instance.role]!,
  'joinedAt': instance.joinedAt.toIso8601String(),
};

const _$RoleEnumMap = {
  Role.owner: 'OWNER',
  Role.manager: 'MANAGER',
  Role.collector: 'COLLECTOR',
  Role.accountant: 'ACCOUNTANT',
  Role.viewer: 'VIEWER',
};
