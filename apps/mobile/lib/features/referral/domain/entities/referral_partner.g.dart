// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_partner.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ReferralPartner _$ReferralPartnerFromJson(Map<String, dynamic> json) =>
    _ReferralPartner(
      id: json['id'] as String,
      partnerCode: json['partnerCode'] as String,
      status: $enumDecode(_$ReferralPartnerStatusEnumMap, json['status']),
      displayName: json['displayName'] as String?,
      totalAccruedAmount: json['totalAccruedAmount'] as String,
      totalPaidAmount: json['totalPaidAmount'] as String,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$ReferralPartnerToJson(_ReferralPartner instance) =>
    <String, dynamic>{
      'id': instance.id,
      'partnerCode': instance.partnerCode,
      'status': _$ReferralPartnerStatusEnumMap[instance.status]!,
      'displayName': instance.displayName,
      'totalAccruedAmount': instance.totalAccruedAmount,
      'totalPaidAmount': instance.totalPaidAmount,
      'createdAt': instance.createdAt,
    };

const _$ReferralPartnerStatusEnumMap = {
  ReferralPartnerStatus.pendingVerification: 'PENDING_VERIFICATION',
  ReferralPartnerStatus.active: 'ACTIVE',
  ReferralPartnerStatus.suspended: 'SUSPENDED',
  ReferralPartnerStatus.closed: 'CLOSED',
};
