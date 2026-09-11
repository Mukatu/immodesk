// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'remittance_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RemittanceSummary _$RemittanceSummaryFromJson(Map<String, dynamic> json) =>
    _RemittanceSummary(
      id: json['id'] as String,
      reference: json['reference'] as String,
      status: $enumDecode(_$RemittanceStatusEnumMap, json['status']),
      collectorUserId: json['collectorUserId'] as String,
      collectorName: json['collectorName'] as String,
      declaredAmount: (json['declaredAmount'] as num).toInt(),
      expectedAmount: (json['expectedAmount'] as num).toInt(),
      countedAmount: (json['countedAmount'] as num).toInt(),
      varianceAmount: (json['varianceAmount'] as num).toInt(),
      receiptsCount: (json['receiptsCount'] as num).toInt(),
      openedAt: json['openedAt'] as String,
      submittedAt: json['submittedAt'] as String?,
      verifiedAt: json['verifiedAt'] as String?,
    );

Map<String, dynamic> _$RemittanceSummaryToJson(_RemittanceSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference': instance.reference,
      'status': _$RemittanceStatusEnumMap[instance.status]!,
      'collectorUserId': instance.collectorUserId,
      'collectorName': instance.collectorName,
      'declaredAmount': instance.declaredAmount,
      'expectedAmount': instance.expectedAmount,
      'countedAmount': instance.countedAmount,
      'varianceAmount': instance.varianceAmount,
      'receiptsCount': instance.receiptsCount,
      'openedAt': instance.openedAt,
      'submittedAt': instance.submittedAt,
      'verifiedAt': instance.verifiedAt,
    };

const _$RemittanceStatusEnumMap = {
  RemittanceStatus.open: 'OPEN',
  RemittanceStatus.submitted: 'SUBMITTED',
  RemittanceStatus.verified: 'VERIFIED',
  RemittanceStatus.deposited: 'DEPOSITED',
  RemittanceStatus.rejected: 'REJECTED',
  RemittanceStatus.cancelled: 'CANCELLED',
};
