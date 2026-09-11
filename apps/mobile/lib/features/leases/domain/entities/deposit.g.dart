// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deposit.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Deposit _$DepositFromJson(Map<String, dynamic> json) => _Deposit(
  id: json['id'] as String,
  leaseId: json['leaseId'] as String,
  tenantId: json['tenantId'] as String,
  status: $enumDecode(_$DepositStatusEnumMap, json['status']),
  requiredAmount: (json['requiredAmount'] as num).toInt(),
  collectedAmount: (json['collectedAmount'] as num?)?.toInt() ?? 0,
  deductedAmount: (json['deductedAmount'] as num?)?.toInt() ?? 0,
  refundedAmount: (json['refundedAmount'] as num?)?.toInt() ?? 0,
  heldAmount: (json['heldAmount'] as num?)?.toInt() ?? 0,
  currency: json['currency'] as String? ?? 'XAF',
  monthsEquivalent: (json['monthsEquivalent'] as num?)?.toInt(),
  dueDate: json['dueDate'] as String?,
  refundDueDate: json['refundDueDate'] as String?,
  refundedAt: json['refundedAt'] as String?,
);

Map<String, dynamic> _$DepositToJson(_Deposit instance) => <String, dynamic>{
  'id': instance.id,
  'leaseId': instance.leaseId,
  'tenantId': instance.tenantId,
  'status': _$DepositStatusEnumMap[instance.status]!,
  'requiredAmount': instance.requiredAmount,
  'collectedAmount': instance.collectedAmount,
  'deductedAmount': instance.deductedAmount,
  'refundedAmount': instance.refundedAmount,
  'heldAmount': instance.heldAmount,
  'currency': instance.currency,
  'monthsEquivalent': instance.monthsEquivalent,
  'dueDate': instance.dueDate,
  'refundDueDate': instance.refundDueDate,
  'refundedAt': instance.refundedAt,
};

const _$DepositStatusEnumMap = {
  DepositStatus.pending: 'PENDING',
  DepositStatus.partiallyPaid: 'PARTIALLY_PAID',
  DepositStatus.held: 'HELD',
  DepositStatus.partiallyRefunded: 'PARTIALLY_REFUNDED',
  DepositStatus.refunded: 'REFUNDED',
  DepositStatus.forfeited: 'FORFEITED',
};
