// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'inspection_submit_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_InspectionSubmitResult _$InspectionSubmitResultFromJson(
  Map<String, dynamic> json,
) => _InspectionSubmitResult(
  id: json['id'] as String,
  reference: json['reference'] as String,
  status: json['status'] as String,
);

Map<String, dynamic> _$InspectionSubmitResultToJson(
  _InspectionSubmitResult instance,
) => <String, dynamic>{
  'id': instance.id,
  'reference': instance.reference,
  'status': instance.status,
};
