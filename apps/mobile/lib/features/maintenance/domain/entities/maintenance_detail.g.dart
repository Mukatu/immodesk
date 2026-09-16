// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_detail.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MaintenanceDetail _$MaintenanceDetailFromJson(
  Map<String, dynamic> json,
) => _MaintenanceDetail(
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
  description: json['description'] as String,
  locationDetail: json['locationDetail'] as String?,
  category: json['category'] as String?,
  reporterType: $enumDecode(_$MaintenanceReporterEnumMap, json['reporterType']),
  estimatedAmount: (json['estimatedAmount'] as num?)?.toInt() ?? 0,
  actualAmount: (json['actualAmount'] as num?)?.toInt() ?? 0,
  chargedTo: json['chargedTo'] as String?,
  landlordApproved: json['landlordApproved'] as bool? ?? false,
  inspectionId: json['inspectionId'] as String?,
  rejectionReason: json['rejectionReason'] as String?,
  updates:
      (json['updates'] as List<dynamic>?)
          ?.map((e) => MaintenanceUpdate.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
);

Map<String, dynamic> _$MaintenanceDetailToJson(_MaintenanceDetail instance) =>
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
      'description': instance.description,
      'locationDetail': instance.locationDetail,
      'category': instance.category,
      'reporterType': _$MaintenanceReporterEnumMap[instance.reporterType]!,
      'estimatedAmount': instance.estimatedAmount,
      'actualAmount': instance.actualAmount,
      'chargedTo': instance.chargedTo,
      'landlordApproved': instance.landlordApproved,
      'inspectionId': instance.inspectionId,
      'rejectionReason': instance.rejectionReason,
      'updates': instance.updates,
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

const _$MaintenanceReporterEnumMap = {
  MaintenanceReporter.tenant: 'TENANT',
  MaintenanceReporter.landlord: 'LANDLORD',
  MaintenanceReporter.collector: 'COLLECTOR',
  MaintenanceReporter.manager: 'MANAGER',
  MaintenanceReporter.inspection: 'INSPECTION',
};
