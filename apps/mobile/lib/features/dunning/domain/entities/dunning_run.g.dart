// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dunning_run.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DunningRunInvoiceRef _$DunningRunInvoiceRefFromJson(
  Map<String, dynamic> json,
) => _DunningRunInvoiceRef(
  id: json['id'] as String,
  invoiceNumber: json['invoiceNumber'] as String?,
);

Map<String, dynamic> _$DunningRunInvoiceRefToJson(
  _DunningRunInvoiceRef instance,
) => <String, dynamic>{
  'id': instance.id,
  'invoiceNumber': instance.invoiceNumber,
};

_DunningRunTenantRef _$DunningRunTenantRefFromJson(Map<String, dynamic> json) =>
    _DunningRunTenantRef(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
    );

Map<String, dynamic> _$DunningRunTenantRefToJson(
  _DunningRunTenantRef instance,
) => <String, dynamic>{'id': instance.id, 'displayName': instance.displayName};

_DunningRun _$DunningRunFromJson(Map<String, dynamic> json) => _DunningRun(
  id: json['id'] as String,
  ruleId: json['ruleId'] as String,
  ruleName: json['ruleName'] as String,
  stepOrder: (json['stepOrder'] as num).toInt(),
  status: $enumDecode(_$DunningStepStatusEnumMap, json['status']),
  runDate: json['runDate'] as String,
  scheduledAt: json['scheduledAt'] as String,
  executedAt: json['executedAt'] as String?,
  daysOverdue: (json['daysOverdue'] as num?)?.toInt() ?? 0,
  balanceAmount: (json['balanceAmount'] as num?)?.toInt() ?? 0,
  channel: $enumDecode(_$NotificationChannelEnumMap, json['channel']),
  invoice: json['invoice'] == null
      ? null
      : DunningRunInvoiceRef.fromJson(json['invoice'] as Map<String, dynamic>),
  tenant: DunningRunTenantRef.fromJson(json['tenant'] as Map<String, dynamic>),
  notificationId: json['notificationId'] as String?,
  messageLogId: json['messageLogId'] as String?,
  messageStatus: $enumDecodeNullable(
    _$MessageStatusEnumMap,
    json['messageStatus'],
  ),
  guarantorNotified: json['guarantorNotified'] as bool? ?? false,
  penaltyApplied: json['penaltyApplied'] as bool? ?? false,
  penaltyAmount: (json['penaltyAmount'] as num?)?.toInt() ?? 0,
  skipReason: json['skipReason'] as String?,
  errorMessage: json['errorMessage'] as String?,
);

Map<String, dynamic> _$DunningRunToJson(_DunningRun instance) =>
    <String, dynamic>{
      'id': instance.id,
      'ruleId': instance.ruleId,
      'ruleName': instance.ruleName,
      'stepOrder': instance.stepOrder,
      'status': _$DunningStepStatusEnumMap[instance.status]!,
      'runDate': instance.runDate,
      'scheduledAt': instance.scheduledAt,
      'executedAt': instance.executedAt,
      'daysOverdue': instance.daysOverdue,
      'balanceAmount': instance.balanceAmount,
      'channel': _$NotificationChannelEnumMap[instance.channel]!,
      'invoice': instance.invoice,
      'tenant': instance.tenant,
      'notificationId': instance.notificationId,
      'messageLogId': instance.messageLogId,
      'messageStatus': _$MessageStatusEnumMap[instance.messageStatus],
      'guarantorNotified': instance.guarantorNotified,
      'penaltyApplied': instance.penaltyApplied,
      'penaltyAmount': instance.penaltyAmount,
      'skipReason': instance.skipReason,
      'errorMessage': instance.errorMessage,
    };

const _$DunningStepStatusEnumMap = {
  DunningStepStatus.pending: 'PENDING',
  DunningStepStatus.running: 'RUNNING',
  DunningStepStatus.sent: 'SENT',
  DunningStepStatus.skipped: 'SKIPPED',
  DunningStepStatus.failed: 'FAILED',
  DunningStepStatus.cancelled: 'CANCELLED',
};

const _$NotificationChannelEnumMap = {
  NotificationChannel.whatsapp: 'WHATSAPP',
  NotificationChannel.sms: 'SMS',
  NotificationChannel.email: 'EMAIL',
  NotificationChannel.push: 'PUSH',
  NotificationChannel.inApp: 'IN_APP',
};

const _$MessageStatusEnumMap = {
  MessageStatus.queued: 'QUEUED',
  MessageStatus.sent: 'SENT',
  MessageStatus.delivered: 'DELIVERED',
  MessageStatus.read: 'READ',
  MessageStatus.failed: 'FAILED',
  MessageStatus.rejected: 'REJECTED',
  MessageStatus.expired: 'EXPIRED',
};
