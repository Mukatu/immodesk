// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_document.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LeaseDocument _$LeaseDocumentFromJson(Map<String, dynamic> json) =>
    _LeaseDocument(
      id: json['id'] as String,
      leaseId: json['leaseId'] as String,
      kind: $enumDecode(_$LeaseDocumentKindEnumMap, json['kind']),
      documentId: json['documentId'] as String,
      version: (json['version'] as num?)?.toInt() ?? 1,
      title: json['title'] as String,
      effectiveDate: json['effectiveDate'] as String?,
      isSigned: json['isSigned'] as bool? ?? false,
      signedAt: json['signedAt'] as String?,
      createdAt: json['createdAt'] as String?,
    );

Map<String, dynamic> _$LeaseDocumentToJson(_LeaseDocument instance) =>
    <String, dynamic>{
      'id': instance.id,
      'leaseId': instance.leaseId,
      'kind': _$LeaseDocumentKindEnumMap[instance.kind]!,
      'documentId': instance.documentId,
      'version': instance.version,
      'title': instance.title,
      'effectiveDate': instance.effectiveDate,
      'isSigned': instance.isSigned,
      'signedAt': instance.signedAt,
      'createdAt': instance.createdAt,
    };

const _$LeaseDocumentKindEnumMap = {
  LeaseDocumentKind.contract: 'CONTRACT',
  LeaseDocumentKind.amendment: 'AMENDMENT',
  LeaseDocumentKind.notice: 'NOTICE',
  LeaseDocumentKind.termination: 'TERMINATION',
  LeaseDocumentKind.inventory: 'INVENTORY',
  LeaseDocumentKind.insurance: 'INSURANCE',
  LeaseDocumentKind.other: 'OTHER',
};
