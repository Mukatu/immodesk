// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'collector_balance.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CollectorBalance _$CollectorBalanceFromJson(Map<String, dynamic> json) =>
    _CollectorBalance(
      userId: json['userId'] as String,
      fullName: json['fullName'] as String,
      heldAmount: (json['heldAmount'] as num).toInt(),
      receiptsCount: (json['receiptsCount'] as num).toInt(),
      oldestReceiptAt: json['oldestReceiptAt'] as String?,
      capAmount: (json['capAmount'] as num).toInt(),
      overCap: json['overCap'] as bool,
      lastRemittanceAt: json['lastRemittanceAt'] as String?,
    );

Map<String, dynamic> _$CollectorBalanceToJson(_CollectorBalance instance) =>
    <String, dynamic>{
      'userId': instance.userId,
      'fullName': instance.fullName,
      'heldAmount': instance.heldAmount,
      'receiptsCount': instance.receiptsCount,
      'oldestReceiptAt': instance.oldestReceiptAt,
      'capAmount': instance.capAmount,
      'overCap': instance.overCap,
      'lastRemittanceAt': instance.lastRemittanceAt,
    };
