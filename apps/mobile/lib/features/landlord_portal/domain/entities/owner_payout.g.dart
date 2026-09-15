// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'owner_payout.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OwnerPayout _$OwnerPayoutFromJson(Map<String, dynamic> json) => _OwnerPayout(
  id: json['id'] as String,
  reference: json['reference'] as String,
  statementId: json['statementId'] as String?,
  status: $enumDecode(_$PayoutStatusEnumMap, json['status']),
  method: $enumDecode(_$PaymentMethodEnumMap, json['method']),
  amount: (json['amount'] as num).toInt(),
  feeAmount: (json['feeAmount'] as num?)?.toInt() ?? 0,
  netAmount: (json['netAmount'] as num).toInt(),
  scheduledDate: json['scheduledDate'] as String?,
  approvedAt: json['approvedAt'] as String?,
  paidAt: json['paidAt'] as String?,
  failureReason: json['failureReason'] as String?,
);

Map<String, dynamic> _$OwnerPayoutToJson(_OwnerPayout instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference': instance.reference,
      'statementId': instance.statementId,
      'status': _$PayoutStatusEnumMap[instance.status]!,
      'method': _$PaymentMethodEnumMap[instance.method]!,
      'amount': instance.amount,
      'feeAmount': instance.feeAmount,
      'netAmount': instance.netAmount,
      'scheduledDate': instance.scheduledDate,
      'approvedAt': instance.approvedAt,
      'paidAt': instance.paidAt,
      'failureReason': instance.failureReason,
    };

const _$PayoutStatusEnumMap = {
  PayoutStatus.pending: 'PENDING',
  PayoutStatus.approved: 'APPROVED',
  PayoutStatus.processing: 'PROCESSING',
  PayoutStatus.paid: 'PAID',
  PayoutStatus.failed: 'FAILED',
  PayoutStatus.cancelled: 'CANCELLED',
};

const _$PaymentMethodEnumMap = {
  PaymentMethod.cash: 'CASH',
  PaymentMethod.mobileMoney: 'MOBILE_MONEY',
  PaymentMethod.bankTransfer: 'BANK_TRANSFER',
  PaymentMethod.bankCheck: 'BANK_CHECK',
};
