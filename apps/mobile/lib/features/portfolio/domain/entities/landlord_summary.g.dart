// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'landlord_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LandlordSummary _$LandlordSummaryFromJson(Map<String, dynamic> json) =>
    _LandlordSummary(
      id: json['id'] as String,
      displayName: json['displayName'] as String,
      primaryPhone: json['primaryPhone'] as String,
      isSelf: json['isSelf'] as bool,
    );

Map<String, dynamic> _$LandlordSummaryToJson(_LandlordSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'displayName': instance.displayName,
      'primaryPhone': instance.primaryPhone,
      'isSelf': instance.isSelf,
    };
