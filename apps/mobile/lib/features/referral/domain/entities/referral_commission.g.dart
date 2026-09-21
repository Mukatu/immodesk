// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_commission.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ReferralCommission _$ReferralCommissionFromJson(Map<String, dynamic> json) =>
    _ReferralCommission(
      id: json['id'] as String,
      referralId: json['referralId'] as String,
      baseAmount: json['baseAmount'] as String,
      rateBps: (json['rateBps'] as num).toInt(),
      commissionAmount: json['commissionAmount'] as String,
      status: $enumDecode(_$ReferralCommissionStatusEnumMap, json['status']),
      periodMonth: json['periodMonth'] as String?,
      accruedAt: json['accruedAt'] as String,
      reversalOfId: json['reversalOfId'] as String?,
    );

Map<String, dynamic> _$ReferralCommissionToJson(_ReferralCommission instance) =>
    <String, dynamic>{
      'id': instance.id,
      'referralId': instance.referralId,
      'baseAmount': instance.baseAmount,
      'rateBps': instance.rateBps,
      'commissionAmount': instance.commissionAmount,
      'status': _$ReferralCommissionStatusEnumMap[instance.status]!,
      'periodMonth': instance.periodMonth,
      'accruedAt': instance.accruedAt,
      'reversalOfId': instance.reversalOfId,
    };

const _$ReferralCommissionStatusEnumMap = {
  ReferralCommissionStatus.accrued: 'ACCRUED',
  ReferralCommissionStatus.approved: 'APPROVED',
  ReferralCommissionStatus.paid: 'PAID',
  ReferralCommissionStatus.reversed: 'REVERSED',
  ReferralCommissionStatus.cancelled: 'CANCELLED',
};
