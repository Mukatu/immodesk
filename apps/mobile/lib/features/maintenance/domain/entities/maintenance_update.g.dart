// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_update.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_MaintenanceUpdate _$MaintenanceUpdateFromJson(Map<String, dynamic> json) =>
    _MaintenanceUpdate(
      id: json['id'] as String,
      requestId: json['requestId'] as String,
      authorUserId: json['authorUserId'] as String?,
      authorLabel: json['authorLabel'] as String?,
      previousStatus: $enumDecodeNullable(
        _$MaintenanceStatusEnumMap,
        json['previousStatus'],
      ),
      newStatus: $enumDecodeNullable(
        _$MaintenanceStatusEnumMap,
        json['newStatus'],
      ),
      message: json['message'] as String?,
      photoDocumentId: json['photoDocumentId'] as String?,
      amountDelta: (json['amountDelta'] as num?)?.toInt(),
      isVisibleToTenant: json['isVisibleToTenant'] as bool? ?? true,
      occurredAt: json['occurredAt'] as String,
    );

Map<String, dynamic> _$MaintenanceUpdateToJson(_MaintenanceUpdate instance) =>
    <String, dynamic>{
      'id': instance.id,
      'requestId': instance.requestId,
      'authorUserId': instance.authorUserId,
      'authorLabel': instance.authorLabel,
      'previousStatus': _$MaintenanceStatusEnumMap[instance.previousStatus],
      'newStatus': _$MaintenanceStatusEnumMap[instance.newStatus],
      'message': instance.message,
      'photoDocumentId': instance.photoDocumentId,
      'amountDelta': instance.amountDelta,
      'isVisibleToTenant': instance.isVisibleToTenant,
      'occurredAt': instance.occurredAt,
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
