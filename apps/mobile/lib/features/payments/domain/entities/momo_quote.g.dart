// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'momo_quote.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MomoQuote _$MomoQuoteFromJson(Map<String, dynamic> json) => _MomoQuote(
  amount: (json['amount'] as num).toInt(),
  feeAmount: (json['feeAmount'] as num).toInt(),
  totalDebited: (json['totalDebited'] as num).toInt(),
  netReceived: (json['netReceived'] as num).toInt(),
  feeBearer: $enumDecode(_$MomoFeeBearerEnumMap, json['feeBearer']),
);

Map<String, dynamic> _$MomoQuoteToJson(_MomoQuote instance) =>
    <String, dynamic>{
      'amount': instance.amount,
      'feeAmount': instance.feeAmount,
      'totalDebited': instance.totalDebited,
      'netReceived': instance.netReceived,
      'feeBearer': _$MomoFeeBearerEnumMap[instance.feeBearer]!,
    };

const _$MomoFeeBearerEnumMap = {
  MomoFeeBearer.tenant: 'TENANT',
  MomoFeeBearer.organization: 'ORGANIZATION',
};
