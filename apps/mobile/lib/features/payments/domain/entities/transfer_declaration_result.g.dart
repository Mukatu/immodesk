// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'transfer_declaration_result.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_TransferDeclarationResult _$TransferDeclarationResultFromJson(
  Map<String, dynamic> json,
) => _TransferDeclarationResult(
  id: json['id'] as String,
  status: $enumDecode(_$DeclarationStatusEnumMap, json['status']),
  paymentId: json['paymentId'] as String?,
  rejectionReason: json['rejectionReason'] as String?,
  clientRef: json['clientRef'] as String?,
);

Map<String, dynamic> _$TransferDeclarationResultToJson(
  _TransferDeclarationResult instance,
) => <String, dynamic>{
  'id': instance.id,
  'status': _$DeclarationStatusEnumMap[instance.status]!,
  'paymentId': instance.paymentId,
  'rejectionReason': instance.rejectionReason,
  'clientRef': instance.clientRef,
};

const _$DeclarationStatusEnumMap = {
  DeclarationStatus.submitted: 'SUBMITTED',
  DeclarationStatus.underReview: 'UNDER_REVIEW',
  DeclarationStatus.matched: 'MATCHED',
  DeclarationStatus.approved: 'APPROVED',
  DeclarationStatus.rejected: 'REJECTED',
  DeclarationStatus.cancelled: 'CANCELLED',
};
