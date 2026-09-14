// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'momo_transaction.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MomoTransaction _$MomoTransactionFromJson(Map<String, dynamic> json) =>
    _MomoTransaction(
      id: json['id'] as String,
      channel: json['channel'] as String,
      status: $enumDecode(_$MomoStatusEnumMap, json['status']),
      provider: $enumDecode(_$MomoProviderEnumMap, json['provider']),
      merchantReference: json['merchantReference'] as String?,
      providerTransactionId: json['providerTransactionId'] as String?,
      aggregatorTransactionId: json['aggregatorTransactionId'] as String?,
      payerMsisdn: json['payerMsisdn'] as String,
      payeeMsisdn: json['payeeMsisdn'] as String?,
      amount: (json['amount'] as num).toInt(),
      feeAmount: (json['feeAmount'] as num?)?.toInt() ?? 0,
      netAmount: (json['netAmount'] as num?)?.toInt(),
      paymentId: json['paymentId'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      failureCode: json['failureCode'] as String?,
      failureMessage: json['failureMessage'] as String?,
      expiresAt: json['expiresAt'] as String?,
      clientRef: json['clientRef'] as String?,
    );

Map<String, dynamic> _$MomoTransactionToJson(_MomoTransaction instance) =>
    <String, dynamic>{
      'id': instance.id,
      'channel': instance.channel,
      'status': _$MomoStatusEnumMap[instance.status]!,
      'provider': _$MomoProviderEnumMap[instance.provider]!,
      'merchantReference': instance.merchantReference,
      'providerTransactionId': instance.providerTransactionId,
      'aggregatorTransactionId': instance.aggregatorTransactionId,
      'payerMsisdn': instance.payerMsisdn,
      'payeeMsisdn': instance.payeeMsisdn,
      'amount': instance.amount,
      'feeAmount': instance.feeAmount,
      'netAmount': instance.netAmount,
      'paymentId': instance.paymentId,
      'rejectionReason': instance.rejectionReason,
      'failureCode': instance.failureCode,
      'failureMessage': instance.failureMessage,
      'expiresAt': instance.expiresAt,
      'clientRef': instance.clientRef,
    };

const _$MomoStatusEnumMap = {
  MomoStatus.initiated: 'INITIATED',
  MomoStatus.pending: 'PENDING',
  MomoStatus.declared: 'DECLARED',
  MomoStatus.succeeded: 'SUCCEEDED',
  MomoStatus.failed: 'FAILED',
  MomoStatus.expired: 'EXPIRED',
  MomoStatus.cancelled: 'CANCELLED',
  MomoStatus.rejected: 'REJECTED',
  MomoStatus.refunded: 'REFUNDED',
};

const _$MomoProviderEnumMap = {
  MomoProvider.mtnMomo: 'MTN_MOMO',
  MomoProvider.airtelMoney: 'AIRTEL_MONEY',
  MomoProvider.cinetPay: 'CINETPAY',
  MomoProvider.pawaPay: 'PAWAPAY',
  MomoProvider.other: 'OTHER',
};
