// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cash_receipt_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CashReceiptTenantRef _$CashReceiptTenantRefFromJson(
  Map<String, dynamic> json,
) => _CashReceiptTenantRef(
  id: json['id'] as String,
  displayName: json['displayName'] as String,
);

Map<String, dynamic> _$CashReceiptTenantRefToJson(
  _CashReceiptTenantRef instance,
) => <String, dynamic>{'id': instance.id, 'displayName': instance.displayName};

_CashReceiptResult _$CashReceiptResultFromJson(Map<String, dynamic> json) =>
    _CashReceiptResult(
      id: json['id'] as String,
      receiptNumber: json['receiptNumber'] as String,
      status: json['status'] as String,
      amount: (json['amount'] as num).toInt(),
      receivedAt: json['receivedAt'] as String,
      tenant: CashReceiptTenantRef.fromJson(
        json['tenant'] as Map<String, dynamic>,
      ),
      documentId: json['documentId'] as String?,
      clientRef: json['clientRef'] as String?,
    );

Map<String, dynamic> _$CashReceiptResultToJson(_CashReceiptResult instance) =>
    <String, dynamic>{
      'id': instance.id,
      'receiptNumber': instance.receiptNumber,
      'status': instance.status,
      'amount': instance.amount,
      'receivedAt': instance.receivedAt,
      'tenant': instance.tenant,
      'documentId': instance.documentId,
      'clientRef': instance.clientRef,
    };
