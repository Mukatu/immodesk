// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_party.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LeaseParty _$LeasePartyFromJson(Map<String, dynamic> json) => _LeaseParty(
  id: json['id'] as String,
  leaseId: json['leaseId'] as String,
  role: $enumDecode(_$LeasePartyRoleEnumMap, json['role']),
  displayName: json['displayName'] as String,
  tenantId: json['tenantId'] as String?,
  guarantorId: json['guarantorId'] as String?,
  shareBps: (json['shareBps'] as num?)?.toInt() ?? 10000,
  isSolidary: json['isSolidary'] as bool? ?? true,
  signedAt: json['signedAt'] as String?,
);

Map<String, dynamic> _$LeasePartyToJson(_LeaseParty instance) =>
    <String, dynamic>{
      'id': instance.id,
      'leaseId': instance.leaseId,
      'role': _$LeasePartyRoleEnumMap[instance.role]!,
      'displayName': instance.displayName,
      'tenantId': instance.tenantId,
      'guarantorId': instance.guarantorId,
      'shareBps': instance.shareBps,
      'isSolidary': instance.isSolidary,
      'signedAt': instance.signedAt,
    };

const _$LeasePartyRoleEnumMap = {
  LeasePartyRole.primaryTenant: 'PRIMARY_TENANT',
  LeasePartyRole.coTenant: 'CO_TENANT',
  LeasePartyRole.guarantor: 'GUARANTOR',
  LeasePartyRole.occupant: 'OCCUPANT',
};
