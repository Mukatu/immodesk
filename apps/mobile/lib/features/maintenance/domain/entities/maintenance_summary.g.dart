// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MaintenancePropertyRef _$MaintenancePropertyRefFromJson(
  Map<String, dynamic> json,
) => _MaintenancePropertyRef(
  id: json['id'] as String,
  name: json['name'] as String,
);

Map<String, dynamic> _$MaintenancePropertyRefToJson(
  _MaintenancePropertyRef instance,
) => <String, dynamic>{'id': instance.id, 'name': instance.name};

_MaintenanceUnitRef _$MaintenanceUnitRefFromJson(Map<String, dynamic> json) =>
    _MaintenanceUnitRef(id: json['id'] as String, code: json['code'] as String);

Map<String, dynamic> _$MaintenanceUnitRefToJson(_MaintenanceUnitRef instance) =>
    <String, dynamic>{'id': instance.id, 'code': instance.code};

_MaintenanceSummary _$MaintenanceSummaryFromJson(Map<String, dynamic> json) =>
    _MaintenanceSummary(
      id: json['id'] as String,
      reference: json['reference'] as String,
      status: $enumDecode(_$MaintenanceStatusEnumMap, json['status']),
      priority: $enumDecode(_$MaintenancePriorityEnumMap, json['priority']),
      title: json['title'] as String,
      property: MaintenancePropertyRef.fromJson(
        json['property'] as Map<String, dynamic>,
      ),
      unit: json['unit'] == null
          ? null
          : MaintenanceUnitRef.fromJson(json['unit'] as Map<String, dynamic>),
      reportedAt: json['reportedAt'] as String,
      slaDueAt: json['slaDueAt'] as String?,
      isOverdue: json['isOverdue'] as bool? ?? false,
      assignedToUserId: json['assignedToUserId'] as String?,
      ageHours: (json['ageHours'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$MaintenanceSummaryToJson(_MaintenanceSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reference': instance.reference,
      'status': _$MaintenanceStatusEnumMap[instance.status]!,
      'priority': _$MaintenancePriorityEnumMap[instance.priority]!,
      'title': instance.title,
      'property': instance.property,
      'unit': instance.unit,
      'reportedAt': instance.reportedAt,
      'slaDueAt': instance.slaDueAt,
      'isOverdue': instance.isOverdue,
      'assignedToUserId': instance.assignedToUserId,
      'ageHours': instance.ageHours,
    };

const _$MaintenanceStatusEnumMap = {
  MaintenanceStatus.open: 'OPEN',
  MaintenanceStatus.acknowledged: 'ACKNOWLEDGED',
  MaintenanceStatus.assigned: 'ASSIGNED',
  MaintenanceStatus.inProgress: 'IN_PROGRESS',
  MaintenanceStatus.onHold: 'ON_HOLD',
  MaintenanceStatus.resolved: 'RESOLVED',
  MaintenanceStatus.closed: 'CLOSED',
  MaintenanceStatus.rejected: 'REJECTED',
};

const _$MaintenancePriorityEnumMap = {
  MaintenancePriority.low: 'LOW',
  MaintenancePriority.normal: 'NORMAL',
  MaintenancePriority.high: 'HIGH',
  MaintenancePriority.urgent: 'URGENT',
};
