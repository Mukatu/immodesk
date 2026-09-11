// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rent_revision.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RentRevision _$RentRevisionFromJson(Map<String, dynamic> json) =>
    _RentRevision(
      id: json['id'] as String,
      leaseId: json['leaseId'] as String,
      effectiveDate: json['effectiveDate'] as String,
      previousRentAmount: (json['previousRentAmount'] as num).toInt(),
      newRentAmount: (json['newRentAmount'] as num).toInt(),
      previousChargesAmount: (json['previousChargesAmount'] as num).toInt(),
      newChargesAmount: (json['newChargesAmount'] as num).toInt(),
      reason: json['reason'] as String?,
    );

Map<String, dynamic> _$RentRevisionToJson(_RentRevision instance) =>
    <String, dynamic>{
      'id': instance.id,
      'leaseId': instance.leaseId,
      'effectiveDate': instance.effectiveDate,
      'previousRentAmount': instance.previousRentAmount,
      'newRentAmount': instance.newRentAmount,
      'previousChargesAmount': instance.previousChargesAmount,
      'newChargesAmount': instance.newChargesAmount,
      'reason': instance.reason,
    };
