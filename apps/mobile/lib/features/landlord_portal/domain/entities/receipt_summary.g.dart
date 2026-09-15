// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receipt_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ReceiptSummaryTenantRef _$ReceiptSummaryTenantRefFromJson(
  Map<String, dynamic> json,
) => _ReceiptSummaryTenantRef(
  id: json['id'] as String,
  displayName: json['displayName'] as String,
);

Map<String, dynamic> _$ReceiptSummaryTenantRefToJson(
  _ReceiptSummaryTenantRef instance,
) => <String, dynamic>{'id': instance.id, 'displayName': instance.displayName};

_ReceiptSummaryUnitRef _$ReceiptSummaryUnitRefFromJson(
  Map<String, dynamic> json,
) => _ReceiptSummaryUnitRef(
  id: json['id'] as String,
  code: json['code'] as String,
);

Map<String, dynamic> _$ReceiptSummaryUnitRefToJson(
  _ReceiptSummaryUnitRef instance,
) => <String, dynamic>{'id': instance.id, 'code': instance.code};

_ReceiptSummary _$ReceiptSummaryFromJson(Map<String, dynamic> json) =>
    _ReceiptSummary(
      id: json['id'] as String,
      receiptNumber: json['receiptNumber'] as String,
      amount: (json['amount'] as num).toInt(),
      receivedAt: json['receivedAt'] as String,
      tenant: ReceiptSummaryTenantRef.fromJson(
        json['tenant'] as Map<String, dynamic>,
      ),
      unit: ReceiptSummaryUnitRef.fromJson(
        json['unit'] as Map<String, dynamic>,
      ),
      downloadUrl: json['downloadUrl'] as String,
    );

Map<String, dynamic> _$ReceiptSummaryToJson(_ReceiptSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'receiptNumber': instance.receiptNumber,
      'amount': instance.amount,
      'receivedAt': instance.receivedAt,
      'tenant': instance.tenant,
      'unit': instance.unit,
      'downloadUrl': instance.downloadUrl,
    };
