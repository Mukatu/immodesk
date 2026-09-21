// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Referral _$ReferralFromJson(Map<String, dynamic> json) => _Referral(
  id: json['id'] as String,
  partnerId: json['partnerId'] as String,
  referredOrganizationId: json['referredOrganizationId'] as String,
  referredPropertyId: json['referredPropertyId'] as String?,
  source: $enumDecode(_$ReferralSourceEnumMap, json['source']),
  status: $enumDecode(_$ReferralStatusEnumMap, json['status']),
  qualifiedAt: json['qualifiedAt'] as String?,
  activatedAt: json['activatedAt'] as String?,
  expiresAt: json['expiresAt'] as String?,
  createdAt: json['createdAt'] as String,
);

Map<String, dynamic> _$ReferralToJson(_Referral instance) => <String, dynamic>{
  'id': instance.id,
  'partnerId': instance.partnerId,
  'referredOrganizationId': instance.referredOrganizationId,
  'referredPropertyId': instance.referredPropertyId,
  'source': _$ReferralSourceEnumMap[instance.source]!,
  'status': _$ReferralStatusEnumMap[instance.status]!,
  'qualifiedAt': instance.qualifiedAt,
  'activatedAt': instance.activatedAt,
  'expiresAt': instance.expiresAt,
  'createdAt': instance.createdAt,
};

const _$ReferralSourceEnumMap = {
  ReferralSource.codeAtSignup: 'CODE_AT_SIGNUP',
  ReferralSource.partnerRegisteredProperty: 'PARTNER_REGISTERED_PROPERTY',
  ReferralSource.link: 'LINK',
  ReferralSource.manualAdmin: 'MANUAL_ADMIN',
};

const _$ReferralStatusEnumMap = {
  ReferralStatus.pending: 'PENDING',
  ReferralStatus.qualified: 'QUALIFIED',
  ReferralStatus.active: 'ACTIVE',
  ReferralStatus.expired: 'EXPIRED',
  ReferralStatus.cancelled: 'CANCELLED',
};
