// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'owner_statement_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_StatementPropertyRef _$StatementPropertyRefFromJson(
  Map<String, dynamic> json,
) => _StatementPropertyRef(
  id: json['id'] as String,
  name: json['name'] as String,
);

Map<String, dynamic> _$StatementPropertyRefToJson(
  _StatementPropertyRef instance,
) => <String, dynamic>{'id': instance.id, 'name': instance.name};

_OwnerStatementSummary _$OwnerStatementSummaryFromJson(
  Map<String, dynamic> json,
) => _OwnerStatementSummary(
  id: json['id'] as String,
  statementNumber: json['statementNumber'] as String,
  status: $enumDecode(_$StatementStatusEnumMap, json['status']),
  property: json['property'] == null
      ? null
      : StatementPropertyRef.fromJson(json['property'] as Map<String, dynamic>),
  periodStart: json['periodStart'] as String,
  periodEnd: json['periodEnd'] as String,
  rentCollectedAmount: (json['rentCollectedAmount'] as num?)?.toInt() ?? 0,
  commissionAmount: (json['commissionAmount'] as num?)?.toInt() ?? 0,
  expensesAmount: (json['expensesAmount'] as num?)?.toInt() ?? 0,
  carryForwardAmount: (json['carryForwardAmount'] as num?)?.toInt() ?? 0,
  netPayableAmount: (json['netPayableAmount'] as num).toInt(),
  issuedAt: json['issuedAt'] as String?,
  sentAt: json['sentAt'] as String?,
  settledAt: json['settledAt'] as String?,
);

Map<String, dynamic> _$OwnerStatementSummaryToJson(
  _OwnerStatementSummary instance,
) => <String, dynamic>{
  'id': instance.id,
  'statementNumber': instance.statementNumber,
  'status': _$StatementStatusEnumMap[instance.status]!,
  'property': instance.property,
  'periodStart': instance.periodStart,
  'periodEnd': instance.periodEnd,
  'rentCollectedAmount': instance.rentCollectedAmount,
  'commissionAmount': instance.commissionAmount,
  'expensesAmount': instance.expensesAmount,
  'carryForwardAmount': instance.carryForwardAmount,
  'netPayableAmount': instance.netPayableAmount,
  'issuedAt': instance.issuedAt,
  'sentAt': instance.sentAt,
  'settledAt': instance.settledAt,
};

const _$StatementStatusEnumMap = {
  StatementStatus.draft: 'DRAFT',
  StatementStatus.issued: 'ISSUED',
  StatementStatus.sent: 'SENT',
  StatementStatus.paid: 'PAID',
  StatementStatus.cancelled: 'CANCELLED',
};
