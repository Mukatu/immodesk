// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'invoice_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_InvoiceLeaseRef _$InvoiceLeaseRefFromJson(Map<String, dynamic> json) =>
    _InvoiceLeaseRef(
      id: json['id'] as String,
      reference: json['reference'] as String?,
    );

Map<String, dynamic> _$InvoiceLeaseRefToJson(_InvoiceLeaseRef instance) =>
    <String, dynamic>{'id': instance.id, 'reference': instance.reference};

_InvoiceTenantRef _$InvoiceTenantRefFromJson(Map<String, dynamic> json) =>
    _InvoiceTenantRef(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      primaryPhone: json['primaryPhone'] as String,
    );

Map<String, dynamic> _$InvoiceTenantRefToJson(_InvoiceTenantRef instance) =>
    <String, dynamic>{
      'id': instance.id,
      'displayName': instance.displayName,
      'primaryPhone': instance.primaryPhone,
    };

_InvoiceUnitRef _$InvoiceUnitRefFromJson(Map<String, dynamic> json) =>
    _InvoiceUnitRef(id: json['id'] as String, code: json['code'] as String);

Map<String, dynamic> _$InvoiceUnitRefToJson(_InvoiceUnitRef instance) =>
    <String, dynamic>{'id': instance.id, 'code': instance.code};

_InvoicePropertyRef _$InvoicePropertyRefFromJson(Map<String, dynamic> json) =>
    _InvoicePropertyRef(id: json['id'] as String, name: json['name'] as String);

Map<String, dynamic> _$InvoicePropertyRefToJson(_InvoicePropertyRef instance) =>
    <String, dynamic>{'id': instance.id, 'name': instance.name};

_InvoiceSummary _$InvoiceSummaryFromJson(Map<String, dynamic> json) =>
    _InvoiceSummary(
      id: json['id'] as String,
      invoiceNumber: json['invoiceNumber'] as String?,
      status: $enumDecode(_$InvoiceStatusEnumMap, json['status']),
      lease: InvoiceLeaseRef.fromJson(json['lease'] as Map<String, dynamic>),
      tenant: InvoiceTenantRef.fromJson(json['tenant'] as Map<String, dynamic>),
      unit: InvoiceUnitRef.fromJson(json['unit'] as Map<String, dynamic>),
      property: InvoicePropertyRef.fromJson(
        json['property'] as Map<String, dynamic>,
      ),
      periodStart: json['periodStart'] as String,
      periodEnd: json['periodEnd'] as String,
      dueDate: json['dueDate'] as String,
      graceUntilDate: json['graceUntilDate'] as String?,
      totalAmount: (json['totalAmount'] as num).toInt(),
      paidAmount: (json['paidAmount'] as num).toInt(),
      balanceAmount: (json['balanceAmount'] as num).toInt(),
    );

Map<String, dynamic> _$InvoiceSummaryToJson(_InvoiceSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'invoiceNumber': instance.invoiceNumber,
      'status': _$InvoiceStatusEnumMap[instance.status]!,
      'lease': instance.lease,
      'tenant': instance.tenant,
      'unit': instance.unit,
      'property': instance.property,
      'periodStart': instance.periodStart,
      'periodEnd': instance.periodEnd,
      'dueDate': instance.dueDate,
      'graceUntilDate': instance.graceUntilDate,
      'totalAmount': instance.totalAmount,
      'paidAmount': instance.paidAmount,
      'balanceAmount': instance.balanceAmount,
    };

const _$InvoiceStatusEnumMap = {
  InvoiceStatus.draft: 'DRAFT',
  InvoiceStatus.issued: 'ISSUED',
  InvoiceStatus.partiallyPaid: 'PARTIALLY_PAID',
  InvoiceStatus.paid: 'PAID',
  InvoiceStatus.overdue: 'OVERDUE',
  InvoiceStatus.cancelled: 'CANCELLED',
};
