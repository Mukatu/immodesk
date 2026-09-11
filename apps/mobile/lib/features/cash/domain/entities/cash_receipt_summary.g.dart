// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cash_receipt_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CashReceiptSummaryTenantRef _$CashReceiptSummaryTenantRefFromJson(
  Map<String, dynamic> json,
) => _CashReceiptSummaryTenantRef(
  id: json['id'] as String,
  displayName: json['displayName'] as String,
);

Map<String, dynamic> _$CashReceiptSummaryTenantRefToJson(
  _CashReceiptSummaryTenantRef instance,
) => <String, dynamic>{'id': instance.id, 'displayName': instance.displayName};

_CashReceiptSummary _$CashReceiptSummaryFromJson(Map<String, dynamic> json) =>
    _CashReceiptSummary(
      id: json['id'] as String,
      receiptNumber: json['receiptNumber'] as String,
      status: $enumDecode(_$CashReceiptStatusEnumMap, json['status']),
      amount: (json['amount'] as num).toInt(),
      receivedAt: json['receivedAt'] as String,
      tenant: CashReceiptSummaryTenantRef.fromJson(
        json['tenant'] as Map<String, dynamic>,
      ),
      collectorUserId: json['collectorUserId'] as String,
      collectorName: json['collectorName'] as String,
      remittanceId: json['remittanceId'] as String?,
      paymentId: json['paymentId'] as String?,
    );

Map<String, dynamic> _$CashReceiptSummaryToJson(_CashReceiptSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'receiptNumber': instance.receiptNumber,
      'status': _$CashReceiptStatusEnumMap[instance.status]!,
      'amount': instance.amount,
      'receivedAt': instance.receivedAt,
      'tenant': instance.tenant,
      'collectorUserId': instance.collectorUserId,
      'collectorName': instance.collectorName,
      'remittanceId': instance.remittanceId,
      'paymentId': instance.paymentId,
    };

const _$CashReceiptStatusEnumMap = {
  CashReceiptStatus.draft: 'DRAFT',
  CashReceiptStatus.issued: 'ISSUED',
  CashReceiptStatus.remitted: 'REMITTED',
  CashReceiptStatus.cancelled: 'CANCELLED',
};
