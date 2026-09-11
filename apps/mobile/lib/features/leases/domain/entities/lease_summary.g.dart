// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LeaseUnitRef _$LeaseUnitRefFromJson(Map<String, dynamic> json) =>
    _LeaseUnitRef(
      id: json['id'] as String,
      code: json['code'] as String,
      label: json['label'] as String?,
    );

Map<String, dynamic> _$LeaseUnitRefToJson(_LeaseUnitRef instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'label': instance.label,
    };

_LeasePropertyRef _$LeasePropertyRefFromJson(Map<String, dynamic> json) =>
    _LeasePropertyRef(id: json['id'] as String, name: json['name'] as String);

Map<String, dynamic> _$LeasePropertyRefToJson(_LeasePropertyRef instance) =>
    <String, dynamic>{'id': instance.id, 'name': instance.name};

_LeaseTenantRef _$LeaseTenantRefFromJson(Map<String, dynamic> json) =>
    _LeaseTenantRef(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      primaryPhone: json['primaryPhone'] as String,
    );

Map<String, dynamic> _$LeaseTenantRefToJson(_LeaseTenantRef instance) =>
    <String, dynamic>{
      'id': instance.id,
      'displayName': instance.displayName,
      'primaryPhone': instance.primaryPhone,
    };

_LeaseSummary _$LeaseSummaryFromJson(Map<String, dynamic> json) =>
    _LeaseSummary(
      id: json['id'] as String,
      reference: json['reference'] as String?,
      status: $enumDecode(_$LeaseStatusEnumMap, json['status']),
      unit: LeaseUnitRef.fromJson(json['unit'] as Map<String, dynamic>),
      property: LeasePropertyRef.fromJson(
        json['property'] as Map<String, dynamic>,
      ),
      tenant: LeaseTenantRef.fromJson(json['tenant'] as Map<String, dynamic>),
      startDate: json['startDate'] as String,
      endDate: json['endDate'] as String?,
      rentAmount: (json['rentAmount'] as num).toInt(),
      chargesAmount: (json['chargesAmount'] as num?)?.toInt() ?? 0,
      paymentDueDay: (json['paymentDueDay'] as num).toInt(),
    );

Map<String, dynamic> _$LeaseSummaryToJson(_LeaseSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference': instance.reference,
      'status': _$LeaseStatusEnumMap[instance.status]!,
      'unit': instance.unit,
      'property': instance.property,
      'tenant': instance.tenant,
      'startDate': instance.startDate,
      'endDate': instance.endDate,
      'rentAmount': instance.rentAmount,
      'chargesAmount': instance.chargesAmount,
      'paymentDueDay': instance.paymentDueDay,
    };

const _$LeaseStatusEnumMap = {
  LeaseStatus.draft: 'DRAFT',
  LeaseStatus.pendingSignature: 'PENDING_SIGNATURE',
  LeaseStatus.active: 'ACTIVE',
  LeaseStatus.noticeGiven: 'NOTICE_GIVEN',
  LeaseStatus.terminated: 'TERMINATED',
  LeaseStatus.expired: 'EXPIRED',
  LeaseStatus.cancelled: 'CANCELLED',
};
